const safeMessages = new Set([
  'Invalid OIDC authorization response',
  'Missing or invalid OIDC identity',
  'Unexpected OIDC authorized party',
  'Unexpected OIDC audience',
  'OIDC_ISSUER must be the issuer identifier, not a discovery document URL',
  'Invalid OIDC issuer or subject',
  'A verified email claim is required',
  'OIDC account creation failed',
  'OIDC identity no longer exists',
  'OIDC_ISSUER must use HTTPS',
  'OIDC is not configured',
  'Unsupported OIDC token endpoint authentication method',
  'API_URL must be an absolute HTTP(S) URL',
  'OIDC_CLIENT_SECRET must be empty when OIDC_TOKEN_ENDPOINT_AUTH_METHOD is none',
  'OIDC_CLIENT_SECRET is required unless OIDC_TOKEN_ENDPOINT_AUTH_METHOD is none',
]);

// Only fixed, known values are logged. The callback's `error` parameter is
// attacker-controlled and providers may echo arbitrary text, so anything
// outside these lists is reduced to a category.
// openid-client / oauth4webapi codes.
const libraryCodePattern = /^OAUTH_[A-Z_]{1,48}$/;
// RFC 6749, RFC 6750, OIDC Core and RFC 9449 error codes.
const oauthErrors = new Set([
  'invalid_request',
  'invalid_client',
  'invalid_grant',
  'unauthorized_client',
  'unsupported_grant_type',
  'invalid_scope',
  'access_denied',
  'unsupported_response_type',
  'server_error',
  'temporarily_unavailable',
  'interaction_required',
  'login_required',
  'account_selection_required',
  'consent_required',
  'invalid_request_uri',
  'invalid_request_object',
  'request_not_supported',
  'request_uri_not_supported',
  'registration_not_supported',
  'invalid_token',
  'insufficient_scope',
  'invalid_dpop_proof',
  'use_dpop_nonce',
]);
// Node.js/undici network and TLS failures worth telling apart.
const networkCodes = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

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
const libraryMessagePattern = /^[A-Za-z0-9 "`()_.,-]{1,120}$/;
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
    if (code && networkCodes.has(code)) return code;
    current =
      typeof current === 'object' && 'cause' in current
        ? current.cause
        : undefined;
  }
  return undefined;
}

export function logOidcError(context: string, error: unknown) {
  const rawCode = stringProperty(error, 'code');
  const code =
    rawCode && (libraryCodePattern.test(rawCode) || networkCodes.has(rawCode))
      ? rawCode
      : 'unknown';

  const details: string[] = [];
  const oauthError = stringProperty(error, 'error');
  if (oauthError) {
    details.push(
      oauthErrors.has(oauthError) ? oauthError : 'other_oauth_error',
    );
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
  if (code === 'OAUTH_UNSUPPORTED_OPERATION') {
    // Without the library's detail the usual cause is an HS256-signed ID
    // token; with it (for example a too-short RSA key), the detail is precise.
    message = detail
      ? `Unsupported provider operation: ${detail}`
      : 'Unsupported provider operation; check that ID tokens are signed with an asymmetric algorithm (RS256, PS256 or ES256) published in the provider JWKS';
  } else if (detail && !safeMessages.has(message)) {
    message = `${message}: ${detail}`;
  }

  const suffix = details.length ? ` (${details.join(', ')})` : '';
  console.error(`${context}: ${code}${suffix}: ${message}`);
}

const sqlStatePattern = /^[0-9A-Z]{5}$/;

/**
 * Logs a failure after the provider exchange succeeded (account lookup,
 * creation, email refresh or session issuance), so operators look at the
 * database rather than the identity provider. Only the SQLSTATE or a known
 * network code is recorded; database messages can contain user data.
 */
export function logOidcDatabaseError(context: string, error: unknown) {
  const rawCode = stringProperty(error, 'code');
  const isPostgresError =
    error instanceof Error && error.name === 'PostgresError';
  const code =
    isPostgresError && rawCode && sqlStatePattern.test(rawCode)
      ? rawCode
      : networkCode(error) ?? 'unknown';
  const message =
    error instanceof Error && safeMessages.has(error.message)
      ? error.message
      : 'Database operation failed';
  console.error(`${context}: database error (${code}): ${message}`);
}
