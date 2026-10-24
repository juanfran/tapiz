import * as oidc from 'openid-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { oidcIdentity } from './oidc.js';

vi.mock('openid-client', () => ({
  discovery: vi.fn(),
  authorizationCodeGrant: vi.fn(),
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

    await expect(request('code=abc&state=expected-state', cookies)).resolves.toMatchObject({
      issuer,
      subject: 'subject-123',
    });
    expect(oidc.authorizationCodeGrant).toHaveBeenCalledWith(
      expect.anything(),
      new URL('http://localhost:4305/api/auth/oidc/callback?code=abc&state=expected-state'),
      {
        expectedState: 'expected-state',
        expectedNonce: 'expected-nonce',
        pkceCodeVerifier: 'expected-verifier',
        idTokenExpected: true,
      },
    );
  });

  it('does not accept a rejected token exchange', async () => {
    vi.mocked(oidc.authorizationCodeGrant).mockRejectedValue(new Error('Invalid ID token'));
    await expect(request('code=abc&state=expected-state', cookies)).rejects.toThrow('Invalid ID token');
  });
});
