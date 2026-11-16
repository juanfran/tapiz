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

export function logOidcError(context: string, error: unknown) {
  const code =
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^[a-zA-Z0-9_-]{1,50}$/.test(error.code)
      ? error.code
      : 'unknown';
  const message =
    error instanceof Error && safeMessages.has(error.message)
      ? error.message
      : 'Provider request or validation failed';
  console.error(`${context}: ${code}: ${message}`);
}
