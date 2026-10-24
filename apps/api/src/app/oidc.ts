import * as oidc from 'openid-client';
import type { FastifyReply, FastifyRequest } from 'fastify';

const cookieOptions = {
  path: '/api/auth/oidc/callback',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env['API_URL']?.startsWith('https://') ?? false,
  maxAge: 600,
};

export function oidcEnabled() {
  return Boolean(process.env['OIDC_ISSUER'] && process.env['OIDC_CLIENT_ID']);
}

export function googleEnabled() {
  return Boolean(
    process.env['GOOGLE_CLIENT_ID'] && process.env['GOOGLE_CLIENT_SECRET'],
  );
}

function issuerUrl() {
  const issuer = process.env['OIDC_ISSUER'];
  if (!issuer || !process.env['OIDC_CLIENT_ID']) {
    throw new Error('OIDC is not configured');
  }
  const url = new URL(issuer);
  if (url.protocol !== 'https:') {
    throw new Error('OIDC_ISSUER must use HTTPS');
  }
  return url;
}

function redirectUri() {
  return `${process.env['API_URL']}/auth/oidc/callback`;
}

let configPromise: Promise<oidc.Configuration> | undefined;
function configuration() {
  const issuer = issuerUrl();
  const clientId = process.env['OIDC_CLIENT_ID'] ?? '';
  return (configPromise ??= oidc
    .discovery(
      issuer,
      clientId,
      process.env['OIDC_CLIENT_SECRET'],
    )
    .catch((error: unknown) => {
      configPromise = undefined;
      throw error;
    }));
}

export async function oidcAuthorizationUrl(reply: FastifyReply) {
  const config = await configuration();
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const verifier = oidc.randomPKCECodeVerifier();
  const challenge = await oidc.calculatePKCECodeChallenge(verifier);
  reply.setCookie('oidc_state', state, cookieOptions);
  reply.setCookie('oidc_nonce', nonce, cookieOptions);
  reply.setCookie('oidc_verifier', verifier, cookieOptions);
  return oidc.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri(),
    scope: 'openid profile email',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
}

export function clearOidcCookies(reply: FastifyReply) {
  for (const name of ['oidc_state', 'oidc_nonce', 'oidc_verifier']) {
    reply.clearCookie(name, { path: cookieOptions.path });
  }
}

export async function oidcIdentity(req: FastifyRequest) {
  const query = req.query as { code?: string; state?: string; error?: string };
  const state = req.cookies['oidc_state'];
  const nonce = req.cookies['oidc_nonce'];
  const verifier = req.cookies['oidc_verifier'];
  if (
    query.error ||
    !query.code ||
    !query.state ||
    !state ||
    !nonce ||
    !verifier ||
    query.state !== state
  ) {
    throw new Error('Invalid OIDC authorization response');
  }
  const config = await configuration();
  const callback = new URL(redirectUri());
  callback.searchParams.set('code', query.code);
  callback.searchParams.set('state', query.state);
  const tokens = await oidc.authorizationCodeGrant(config, callback, {
    expectedState: state,
    expectedNonce: nonce,
    pkceCodeVerifier: verifier,
    idTokenExpected: true,
  });
  const claims = tokens.claims();
  if (!claims?.sub || claims.iss !== config.serverMetadata().issuer) {
    throw new Error('Missing or invalid OIDC identity');
  }
  return identityFromClaims(claims, config.serverMetadata().issuer);
}

export function identityFromClaims(
  claims: Record<string, unknown>,
  expectedIssuer: string,
) {
  if (
    claims['iss'] !== expectedIssuer ||
    typeof claims['sub'] !== 'string' ||
    !claims['sub']
  ) {
    throw new Error('Invalid OIDC issuer or subject');
  }
  // Email is only a contact attribute, never an account-linking key.
  const email = claims['email'];
  if (
    typeof email !== 'string' ||
    claims['email_verified'] !== true ||
    !email ||
    email.length > 320
  ) {
    throw new Error('A verified email claim is required');
  }
  return {
    issuer: expectedIssuer,
    subject: claims['sub'],
    email,
    name:
      typeof claims['name'] === 'string' ? claims['name'].slice(0, 256) : email,
    picture:
      typeof claims['picture'] === 'string' ? claims['picture'] : undefined,
  };
}
