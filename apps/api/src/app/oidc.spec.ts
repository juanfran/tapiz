import { afterEach, describe, expect, it, vi } from 'vitest';
import { identityFromClaims, validateOidcConfiguration } from './oidc.js';

const issuer = 'https://idp.example.test/realms/example';
const claims = {
  iss: issuer,
  sub: 'subject-123',
  email: 'person@example.test',
  email_verified: true,
  name: 'Example User',
};

describe('OIDC identity claims', () => {
  it('keys the identity by issuer and subject, not email', () => {
    expect(identityFromClaims(claims, issuer)).toMatchObject({
      issuer,
      subject: 'subject-123',
      email: 'person@example.test',
    });
  });

  it('normalizes a verified email without changing the identity key', () => {
    expect(
      identityFromClaims({ ...claims, email: 'Person.X@Example.test' }, issuer),
    ).toMatchObject({
      issuer,
      subject: 'subject-123',
      email: 'person.x@example.test',
    });
  });

  it('keeps only absolute HTTP(S) profile pictures', () => {
    expect(
      identityFromClaims(
        { ...claims, picture: 'https://idp.example.test/a.png' },
        issuer,
      ).picture,
    ).toBe('https://idp.example.test/a.png');
    expect(
      identityFromClaims(
        { ...claims, picture: 'HTTPS://IDP.example.test/a.png' },
        issuer,
      ).picture,
    ).toBe('https://idp.example.test/a.png');
    for (const picture of [
      'data:image/png;base64,AAAA',
      'javascript:alert(1)',
      'avatar.png',
      'https:avatar.png',
      `https://idp.example.test/${'a'.repeat(2100)}`,
      // About 425 characters that percent-encode to more than 2048.
      `https://idp.example.test/${'é'.repeat(400)}`,
    ]) {
      expect(identityFromClaims({ ...claims, picture }, issuer).picture).toBe(
        undefined,
      );
    }
  });

  it('rejects claims from a different issuer', () => {
    expect(() =>
      identityFromClaims(claims, 'https://other.example.test'),
    ).toThrow();
  });

  it('rejects missing subjects and unverified emails', () => {
    expect(() => identityFromClaims({ ...claims, sub: '' }, issuer)).toThrow();
    expect(() =>
      identityFromClaims({ ...claims, email_verified: false }, issuer),
    ).toThrow();
    expect(() =>
      identityFromClaims({ ...claims, email: undefined }, issuer),
    ).toThrow();
  });
});

describe('OIDC configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function configure(method: string) {
    vi.stubEnv('OIDC_ISSUER', issuer);
    vi.stubEnv('OIDC_CLIENT_ID', 'tapiz');
    vi.stubEnv('OIDC_CLIENT_SECRET', 'secret');
    vi.stubEnv('API_URL', 'https://tapiz.example.test/api');
    vi.stubEnv('OIDC_TOKEN_ENDPOINT_AUTH_METHOD', method);
  }

  it('treats an empty token endpoint auth method as the default', () => {
    configure('');
    expect(() => validateOidcConfiguration()).not.toThrow();
  });

  it('rejects an unsupported token endpoint auth method at startup', () => {
    configure('private_key_jwt');
    expect(() => validateOidcConfiguration()).toThrow(
      'Unsupported OIDC token endpoint authentication method',
    );
  });
});
