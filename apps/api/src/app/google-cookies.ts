/**
 * Transient cookies of the Google login (state and PKCE verifier). Like the
 * OIDC ones, on HTTPS they use the `__Host-` prefix: browsers only accept
 * such cookies from the API host itself (Secure, no Domain, Path=/), so a
 * sibling subdomain cannot plant a forged transaction (login CSRF).
 * Plain-HTTP development keeps unprefixed cookies.
 */
export function googleTransientCookies(apiUrl = process.env['API_URL'] ?? '') {
  const secure = apiUrl.startsWith('https:');
  const prefix = secure ? '__Host-' : '';
  return {
    names: {
      state: `${prefix}state`,
      verifier: `${prefix}code_verifier`,
    },
    options: {
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'lax' as const,
      maxAge: 60 * 10,
    },
  };
}
