import { describe, expect, it } from 'vitest';
import { googleTransientCookies } from './google-cookies.js';

describe('Google login transient cookies', () => {
  it('uses __Host- prefixed, secure cookies on HTTPS', () => {
    const { names, options } = googleTransientCookies(
      'https://tapiz.example.test/api',
    );

    expect(names).toEqual({
      state: '__Host-state',
      verifier: '__Host-code_verifier',
    });
    // __Host- cookies must be Secure, have Path=/ and no Domain.
    expect(options).toEqual({
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600,
    });
  });

  it('keeps unprefixed cookies on plain-HTTP development', () => {
    const { names, options } = googleTransientCookies(
      'http://localhost:8000/api',
    );

    expect(names).toEqual({ state: 'state', verifier: 'code_verifier' });
    expect(options.secure).toBe(false);
  });
});
