import * as oidc from 'openid-client';
import type { FastifyReply, FastifyRequest } from 'fastify';

// Scope the transient cookies to the callback path, which follows API_URL so
// that deployments serving the API under a path prefix still receive them.
function cookieOptions() {
  return {
    path: new URL(redirectUri()).pathname,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env['API_URL']?.startsWith('https://') ?? false,
    maxAge: 600,
  };
}

export function oidcEnabled() {
  return Boolean(process.env['OIDC_ISSUER'] && process.env['OIDC_CLIENT_ID']);
}

export function validateOidcConfiguration() {
  if (process.env['OIDC_ISSUER'] || process.env['OIDC_CLIENT_ID']) {
    issuerUrl();
    tokenEndpointAuthMethod();
  }
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

function tokenEndpointAuthMethod() {
  const method =
    process.env['OIDC_TOKEN_ENDPOINT_AUTH_METHOD'] || 'client_secret_basic';
  if (method !== 'client_secret_basic' && method !== 'client_secret_post') {
    throw new Error('Unsupported OIDC token endpoint authentication method');
  }
  return method;
}

let configPromise: Promise<oidc.Configuration> | undefined;
let configKey: string | undefined;
function configuration() {
  const issuer = issuerUrl();
  const clientId = process.env['OIDC_CLIENT_ID'] ?? '';
  const secret = process.env['OIDC_CLIENT_SECRET'];
  const method = tokenEndpointAuthMethod();
  const key = JSON.stringify([issuer.href, clientId, secret, method]);
  if (configKey !== key) {
    configPromise = undefined;
    configKey = key;
  }
  return (configPromise ??= oidc
    .discovery(
      issuer,
      clientId,
      secret,
      secret
        ? method === 'client_secret_post'
          ? oidc.ClientSecretPost(secret)
          : oidc.ClientSecretBasic(secret)
        : undefined,
      { execute: [oidc.enableNonRepudiationChecks] },
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
  const options = cookieOptions();
  reply.setCookie('oidc_state', state, options);
  reply.setCookie('oidc_nonce', nonce, options);
  reply.setCookie('oidc_verifier', verifier, options);
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
  const { path } = cookieOptions();
  for (const name of ['oidc_state', 'oidc_nonce', 'oidc_verifier']) {
    reply.clearCookie(name, { path });
  }
}

/**
 * A callback whose state does not match the cookies belongs to an older login
 * attempt (for example another tab). Its cookies belong to the newest attempt,
 * so they must survive this failure for that attempt to complete.
 */
export function isStaleOidcCallback(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'staleOidcState' in error &&
    error.staleOidcState === true
  );
}

export async function oidcIdentity(req: FastifyRequest) {
  const query = req.query as {
    code?: string;
    state?: string;
    iss?: string;
    error?: string;
  };
  const state = req.cookies['oidc_state'];
  const nonce = req.cookies['oidc_nonce'];
  const verifier = req.cookies['oidc_verifier'];
  if (query.state && state && query.state !== state) {
    throw Object.assign(new Error('Invalid OIDC authorization response'), {
      error: query.error,
      staleOidcState: true,
    });
  }
  if (
    query.error ||
    !query.code ||
    !query.state ||
    !state ||
    !nonce ||
    !verifier ||
    query.state !== state
  ) {
    // Keep the provider's error code (for example `access_denied`) for logs;
    // the logger only records it when it is a plain OAuth error token.
    throw Object.assign(new Error('Invalid OIDC authorization response'), {
      error: query.error,
    });
  }
  const config = await configuration();
  const callback = new URL(redirectUri());
  callback.searchParams.set('code', query.code);
  callback.searchParams.set('state', query.state);
  if (query.iss) callback.searchParams.set('iss', query.iss);
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
  // Providers may return requested profile/email claims only from UserInfo.
  // Keep the issuer and subject from the validated ID token as the identity key.
  if (
    typeof claims['email'] !== 'string' ||
    claims['email_verified'] !== true
  ) {
    if (!tokens.access_token) {
      throw new Error('A verified email claim is required');
    }
    const userInfo = await oidc.fetchUserInfo(
      config,
      tokens.access_token,
      claims.sub,
    );
    return identityFromClaims(
      {
        ...claims,
        email: userInfo.email,
        email_verified: userInfo.email_verified,
        name:
          typeof claims['name'] === 'string' ? claims['name'] : userInfo.name,
        picture:
          typeof claims['picture'] === 'string'
            ? claims['picture']
            : userInfo.picture,
      },
      config.serverMetadata().issuer,
    );
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
    email: email.toLowerCase(),
    // Undefined when the provider sent no profile claim, so a returning user's
    // stored name/picture is kept instead of being replaced by a fallback.
    name:
      typeof claims['name'] === 'string' && claims['name']
        ? claims['name'].slice(0, 256)
        : undefined,
    picture:
      typeof claims['picture'] === 'string' && claims['picture']
        ? claims['picture']
        : undefined,
  };
}
