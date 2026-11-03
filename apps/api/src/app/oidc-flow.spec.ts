import * as oidc from 'openid-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { oidcIdentity } from './oidc.js';

vi.mock('openid-client', () => ({
  discovery: vi.fn(),
  authorizationCodeGrant: vi.fn(),
  fetchUserInfo: vi.fn(),
  ClientSecretBasic: vi.fn(() => 'basic-auth'),
  ClientSecretPost: vi.fn(() => 'post-auth'),
}));

const issuer = 'https://idp.example.test/realms/example';

async function request(query: string, cookies: Record<string, string>) {
  const req = {
    query: Object.fromEntries(new URLSearchParams(query)),
    cookies,
  } as Parameters<typeof oidcIdentity>[0];
  return oidcIdentity(req);
}

beforeEach(() => {
  vi.resetAllMocks();
  delete process.env['OIDC_TOKEN_ENDPOINT_AUTH_METHOD'];
  delete process.env['OIDC_CLIENT_SECRET'];
  process.env['OIDC_ISSUER'] = issuer;
  process.env['OIDC_CLIENT_ID'] = 'test-client';
  process.env['API_URL'] = 'http://localhost:4305/api';
  vi.mocked(oidc.discovery).mockResolvedValue({
    serverMetadata: () => ({ issuer }),
  } as Awaited<ReturnType<typeof oidc.discovery>>);
});

describe('OIDC authorization-code exchange', () => {
  const cookies = {
    oidc_state: 'expected-state',
    oidc_nonce: 'expected-nonce',
    oidc_verifier: 'expected-verifier',
  };

  it('rejects a mismatched state before exchanging the authorization code', async () => {
    await expect(request('code=abc&state=wrong', cookies)).rejects.toThrow();
    expect(oidc.authorizationCodeGrant).not.toHaveBeenCalled();
  });

  it('requires the nonce and PKCE verifier cookies', async () => {
    await expect(request('code=abc&state=expected-state', {
      ...cookies,
      oidc_nonce: '',
    })).rejects.toThrow();
    await expect(request('code=abc&state=expected-state', {
      ...cookies,
      oidc_verifier: '',
    })).rejects.toThrow();
    expect(oidc.authorizationCodeGrant).not.toHaveBeenCalled();
  });

  it('passes state, nonce, verifier and the callback URL to the token validator', async () => {
    vi.mocked(oidc.authorizationCodeGrant).mockResolvedValue({
      claims: () => ({
        iss: issuer,
        sub: 'subject-123',
        email: 'person@example.test',
        email_verified: true,
      }),
    } as Awaited<ReturnType<typeof oidc.authorizationCodeGrant>>);

    await expect(request(`code=abc&state=expected-state&iss=${encodeURIComponent(issuer)}`, cookies))
      .resolves.toMatchObject({ issuer, subject: 'subject-123' });
    expect(oidc.authorizationCodeGrant).toHaveBeenCalledWith(
      expect.anything(),
      new URL(`http://localhost:4305/api/auth/oidc/callback?code=abc&state=expected-state&iss=${encodeURIComponent(issuer)}`),
      {
        expectedState: 'expected-state',
        expectedNonce: 'expected-nonce',
        pkceCodeVerifier: 'expected-verifier',
        idTokenExpected: true,
      },
    );
  });

  it('uses a verified UserInfo email when ID token omits it', async () => {
    vi.mocked(oidc.authorizationCodeGrant).mockResolvedValue({
      claims: () => ({ iss: issuer, sub: 'subject-123' }),
      access_token: 'access-token',
    } as Awaited<ReturnType<typeof oidc.authorizationCodeGrant>>);
    vi.mocked(oidc.fetchUserInfo).mockResolvedValue({
      sub: 'subject-123', email: 'person@example.test', email_verified: true,
    });

    await expect(request('code=abc&state=expected-state', cookies)).resolves.toMatchObject({
      issuer, subject: 'subject-123', email: 'person@example.test',
    });
    expect(oidc.fetchUserInfo).toHaveBeenCalledWith(
      expect.anything(), 'access-token', 'subject-123',
    );
  });

  it('rejects UserInfo with a mismatched subject', async () => {
    vi.mocked(oidc.authorizationCodeGrant).mockResolvedValue({
      claims: () => ({ iss: issuer, sub: 'subject-123' }),
      access_token: 'access-token',
    } as Awaited<ReturnType<typeof oidc.authorizationCodeGrant>>);
    vi.mocked(oidc.fetchUserInfo).mockRejectedValue(new Error('unexpected UserInfo sub'));
    await expect(request('code=abc&state=expected-state', cookies))
      .rejects.toThrow('unexpected UserInfo sub');
  });

  it('configures Basic client authentication for a Basic-only provider', async () => {
    process.env['OIDC_CLIENT_SECRET'] = 'test-secret';
    vi.mocked(oidc.authorizationCodeGrant).mockResolvedValue({
      claims: () => ({ iss: issuer, sub: 'subject-123', email: 'person@example.test', email_verified: true }),
    } as Awaited<ReturnType<typeof oidc.authorizationCodeGrant>>);
    await request('code=abc&state=expected-state', cookies);
    expect(oidc.ClientSecretBasic).toHaveBeenCalledWith('test-secret');
    expect(oidc.discovery).toHaveBeenCalledWith(
      new URL(issuer), 'test-client', 'test-secret', 'basic-auth',
    );
  });

  it('uses post authentication only when explicitly configured', async () => {
    process.env['OIDC_CLIENT_SECRET'] = 'test-secret';
    process.env['OIDC_TOKEN_ENDPOINT_AUTH_METHOD'] = 'client_secret_post';
    vi.mocked(oidc.authorizationCodeGrant).mockResolvedValue({
      claims: () => ({ iss: issuer, sub: 'subject-123', email: 'person@example.test', email_verified: true }),
    } as Awaited<ReturnType<typeof oidc.authorizationCodeGrant>>);
    await request('code=abc&state=expected-state', cookies);
    expect(oidc.ClientSecretPost).toHaveBeenCalledWith('test-secret');
    expect(oidc.discovery).toHaveBeenCalledWith(
      new URL(issuer), 'test-client', 'test-secret', 'post-auth',
    );
  });

  it('does not accept a rejected token exchange', async () => {
    vi.mocked(oidc.authorizationCodeGrant).mockRejectedValue(new Error('Invalid ID token'));
    await expect(request('code=abc&state=expected-state', cookies)).rejects.toThrow('Invalid ID token');
  });
});
