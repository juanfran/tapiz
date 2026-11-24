const safeMessages = new Set([
  'Invalid OIDC authorization response',
  'Missing or invalid OIDC identity',
  'Invalid OIDC issuer or subject',
  'A verified email claim is required',
  'OIDC account creation failed',
  'OIDC identity no longer exists',
  'OIDC_ISSUER must use HTTPS',
  'OIDC is not configured',
  'Unsupported OIDC token endpoint authentication method',
]);

const codePattern = /^[a-zA-Z0-9_-]{1,50}$/;
// RFC 6749 error codes are fixed tokens such as `invalid_client`; unlike
// `error_description`, they never carry provider- or user-supplied text.
const oauthErrorPattern = /^[a-z_]{1,64}$/;
// Node.js/undici network codes such as ECONNREFUSED or UND_ERR_CONNECT_TIMEOUT.
const networkCodePattern = /^(E[A-Z0-9_]{2,30}|UND_ERR_[A-Z0-9_]{1,40})$/;

function stringProperty(value: unknown, key: string): string | undefined {
  if (value && typeof value === 'object' && key in value) {
    const property = (value as Record<string, unknown>)[key];
    return typeof property === 'string' ? property : undefined;
  }
  return undefined;
}

// oauth4webapi keeps values (claims, bodies, keys) in `cause` and uses fixed
// messages such as `unexpected ID Token "nonce" claim value`. Only messages
// made of these characters are logged, so no URL, email or token can pass.
const libraryMessagePattern = /^[A-Za-z0-9 "()_.,-]{1,120}$/;
const libraryErrorNames = new Set([
  'OperationProcessingError',
  'UnsupportedOperationError',
]);

function libraryDetail(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth++) {
    if (
      current instanceof Error &&
      libraryErrorNames.has(current.name) &&
      libraryMessagePattern.test(current.message)
    ) {
      return current.message;
    }
    current =
      typeof current === 'object' && 'cause' in current
        ? current.cause
        : undefined;
  }
  return undefined;
}

function networkCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth++) {
    const code = stringProperty(current, 'code');
    if (code && networkCodePattern.test(code)) return code;
    current =
      typeof current === 'object' && 'cause' in current
        ? current.cause
        : undefined;
  }
  return undefined;
}

export function logOidcError(context: string, error: unknown) {
  const rawCode = stringProperty(error, 'code');
  const code = rawCode && codePattern.test(rawCode) ? rawCode : 'unknown';

  const details: string[] = [];
  const oauthError = stringProperty(error, 'error');
  if (oauthError && oauthErrorPattern.test(oauthError)) {
    details.push(oauthError);
  }
  const status =
    error && typeof error === 'object' && 'status' in error
      ? error.status
      : undefined;
  if (typeof status === 'number' && Number.isInteger(status)) {
    details.push(`HTTP ${status}`);
  }
  const network = networkCode(error);
  if (network && network !== code) details.push(network);

  let message =
    error instanceof Error && safeMessages.has(error.message)
      ? error.message
      : 'Provider request or validation failed';
  const detail = libraryDetail(error);
  if (detail && !safeMessages.has(message)) message = `${message}: ${detail}`;
  if (code === 'OAUTH_UNSUPPORTED_OPERATION') {
    message =
      'Unsupported provider operation; ID tokens must be signed with an asymmetric algorithm (RS256, PS256 or ES256) published in the provider JWKS';
  }

  const suffix = details.length ? ` (${details.join(', ')})` : '';
  console.error(`${context}: ${code}${suffix}: ${message}`);
}
