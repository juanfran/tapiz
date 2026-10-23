import { describe, expect, it } from 'vitest';
import { identityFromClaims } from './oidc.js';

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
