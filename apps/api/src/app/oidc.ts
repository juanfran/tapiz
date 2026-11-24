import * as oidc from 'openid-client';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { logOidcError } from './routers/oidc-error.js';

// Bounds token, UserInfo and JWKS requests as well as discovery.
const providerTimeoutSeconds = 10;

/**
 * Transient authorization cookies. On HTTPS they use the `__Host-` prefix:
 * browsers only accept such cookies from the API host itself (Secure, no
 * Domain, Path=/), so a sibling subdomain cannot plant a forged transaction
 * (login CSRF). Plain-HTTP development keeps unprefixed cookies scoped to the
 * callback path, which follows API_URL for deployments under a path prefix.
 */
function transientCookies() {
  const callback = callbackUrl();
  const secure = callback.protocol === 'https:';
  const prefix = secure ? '__Host-' : '';
  return {
    names: {
      state: `${prefix}oidc_state`,
      nonce: `${prefix}oidc_nonce`,
      verifier: `${prefix}oidc_verifier`,
    },
    options: {
      path: secure ? '/' : callback.pathname,
      httpOnly: true,
      sameSite: 'lax' as const,
      secure,
      maxAge: 600,
    },
  };
}

export function oidcEnabled() {
  return Boolean(process.env['OIDC_ISSUER'] && process.env['OIDC_CLIENT_ID']);
}

export function validateOidcConfiguration() {
  if (process.env['OIDC_ISSUER'] || process.env['OIDC_CLIENT_ID']) {
    issuerUrl();
    callbackUrl();
    clientAuthentication();
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
  // openid-client only compares the discovered issuer with the configured one
  // when it resolves the well-known URL itself.
  if (url.pathname.includes('/.well-known/') || url.search || url.hash) {
    throw new Error(
      'OIDC_ISSUER must be the issuer identifier, not a discovery document URL',
    );
  }
  return url;
}

function callbackUrl() {
  let url: URL;
  try {
    url = new URL(process.env['API_URL'] ?? '');
  } catch {
    throw new Error('API_URL must be an absolute HTTP(S) URL');
  }
  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.search ||
    url.hash
  ) {
    throw new Error('API_URL must be an absolute HTTP(S) URL');
  }
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/auth/oidc/callback`;
  return url;
}

function redirectUri() {
  return callbackUrl().href;
}

function clientAuthentication() {
  const method =
    process.env['OIDC_TOKEN_ENDPOINT_AUTH_METHOD'] || 'client_secret_basic';
  const secret = process.env['OIDC_CLIENT_SECRET'] ?? '';
  switch (method) {
    case 'none':
      // Public client: PKCE protects the authorization code.
      if (secret) {
        throw new Error(
          'OIDC_CLIENT_SECRET must be empty when OIDC_TOKEN_ENDPOINT_AUTH_METHOD is none',
        );
      }
      return { method, secret: undefined, auth: oidc.None() };
    case 'client_secret_basic':
    case 'client_secret_post':
      if (!secret) {
        throw new Error(
          'OIDC_CLIENT_SECRET is required unless OIDC_TOKEN_ENDPOINT_AUTH_METHOD is none',
        );
      }
      return {
        method,
        secret,
        auth:
          method === 'client_secret_post'
            ? oidc.ClientSecretPost(secret)
            : oidc.ClientSecretBasic(secret),
      };
    default:
      throw new Error('Unsupported OIDC token endpoint authentication method');
  }
}

let configPromise: Promise<oidc.Configuration> | undefined;
let configKey: string | undefined;
function configuration() {
  const issuer = issuerUrl();
  const clientId = process.env['OIDC_CLIENT_ID'] ?? '';
  const { method, secret, auth } = clientAuthentication();
  const key = JSON.stringify([issuer.href, clientId, secret, method]);
  if (configKey !== key) {
    configPromise = undefined;
    configKey = key;
  }
  return (configPromise ??= oidc
    .discovery(issuer, clientId, secret, auth, {
      execute: [oidc.enableNonRepudiationChecks],
      timeout: providerTimeoutSeconds,
    })
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
  const { names, options } = transientCookies();
  reply.setCookie(names.state, state, options);
  reply.setCookie(names.nonce, nonce, options);
  reply.setCookie(names.verifier, verifier, options);
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
  const { names, options } = transientCookies();
  for (const name of Object.values(names)) {
    reply.clearCookie(name, {
      path: options.path,
      secure: options.secure,
      httpOnly: true,
      sameSite: 'lax',
    });
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
  const query = req.query as Record<string, unknown>;
  // Fastify turns repeated parameters into arrays; a valid authorization
  // response carries each of these at most once.
  for (const name of ['code', 'state', 'iss', 'error']) {
    if (query[name] !== undefined && typeof query[name] !== 'string') {
      throw new Error('Invalid OIDC authorization response');
    }
  }
  const {
    code,
    state: queryState,
    iss,
    error: providerError,
  } = query as {
    code?: string;
    state?: string;
    iss?: string;
    error?: string;
  };
  const { names } = transientCookies();
  const state = req.cookies[names.state];
  const nonce = req.cookies[names.nonce];
  const verifier = req.cookies[names.verifier];
  if (queryState && state && queryState !== state) {
    throw Object.assign(new Error('Invalid OIDC authorization response'), {
      error: providerError,
      staleOidcState: true,
    });
  }
  if (
    providerError ||
    !code ||
    !queryState ||
    !state ||
    !nonce ||
    !verifier ||
    queryState !== state
  ) {
    // Keep the provider's error code (for example `access_denied`) for logs;
    // the logger only records it when it is a plain OAuth error token.
    throw Object.assign(new Error('Invalid OIDC authorization response'), {
      error: providerError,
    });
  }
  const config = await configuration();
  const callback = callbackUrl();
  callback.searchParams.set('code', code);
  callback.searchParams.set('state', queryState);
  if (iss) callback.searchParams.set('iss', iss);
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
  const clientId = process.env['OIDC_CLIENT_ID'];
  // openid-client requires Tapiz in `aud` and, when `aud` lists other
  // audiences (for example Zitadel's project ID), an `azp` equal to the Tapiz
  // client. It skips `azp` for a single audience, so check it here too: a
  // token whose authorized party is another client is never accepted.
  if (claims.azp !== undefined && claims.azp !== clientId) {
    throw new Error('Unexpected OIDC authorized party');
  }
  // Providers may return requested email/profile claims only from UserInfo.
  // The validated ID token's issuer and subject stay the identity key.
  const emailInIdToken =
    typeof claims['email'] === 'string' && claims['email_verified'] === true;
  const profileInIdToken =
    nonEmptyString(claims['name']) && nonEmptyString(claims['picture']);
  let userInfo: oidc.UserInfoResponse | undefined;
  if (!emailInIdToken) {
    if (!tokens.access_token) {
      throw new Error('A verified email claim is required');
    }
    userInfo = await oidc.fetchUserInfo(
      config,
      tokens.access_token,
      claims.sub,
    );
  } else if (
    !profileInIdToken &&
    tokens.access_token &&
    config.serverMetadata().userinfo_endpoint
  ) {
    // Optional: only refreshes name/picture, so a failure must not block login.
    try {
      userInfo = await oidc.fetchUserInfo(
        config,
        tokens.access_token,
        claims.sub,
      );
    } catch (error) {
      logOidcError('OIDC profile lookup failed', error);
    }
  }
  return identityFromClaims(
    {
      ...claims,
      email: emailInIdToken ? claims['email'] : userInfo?.email,
      email_verified: emailInIdToken ? true : userInfo?.email_verified,
      name: nonEmptyString(claims['name']) ? claims['name'] : userInfo?.name,
      picture: usablePicture(claims['picture'])
        ? claims['picture']
        : userInfo?.picture,
    },
    config.serverMetadata().issuer,
  );
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** Only absolute HTTP(S) URLs render as avatars (`ngSrc` rejects others). */
function usablePicture(value: unknown): value is string {
  if (!nonEmptyString(value) || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
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
    picture: usablePicture(claims['picture']) ? claims['picture'] : undefined,
  };
}
