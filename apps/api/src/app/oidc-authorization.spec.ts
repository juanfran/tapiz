import { createHash } from 'node:crypto';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import * as oidc from 'openid-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearOidcCookies,
  oidcAuthorizationUrl,
  oidcIdentity,
} from './oidc.js';

vi.mock('openid-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('openid-client')>()),
  discovery: vi.fn(),
}));

const issuer = 'https://idp.example.test/realms/example';

beforeEach(async () => {
  vi.stubEnv('OIDC_ISSUER', issuer);
  vi.stubEnv('OIDC_CLIENT_ID', 'authorization-test-client');
  vi.stubEnv('OIDC_CLIENT_SECRET', 'authorization-test-secret');
  vi.stubEnv('API_URL', 'https://tapiz.example.test/api');
  const actual =
    await vi.importActual<typeof import('openid-client')>('openid-client');
  vi.mocked(oidc.discovery).mockResolvedValue(
    new actual.Configuration(
      {
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
      },
      'authorization-test-client',
      'authorization-test-secret',
    ),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function startLogin() {
  const app = Fastify();
  await app.register(fastifyCookie);
  app.get('/start', async (_req, reply) => {
    const url = await oidcAuthorizationUrl(reply);
    return reply.redirect(url.href);
  });
  app.get('/clear', async (_req, reply) => {
    clearOidcCookies(reply);
    return reply.send();
  });
  const start = await app.inject('/start');
  const clear = await app.inject('/clear');
  await app.close();
  const cookies = Object.fromEntries(start.cookies.map((c) => [c.name, c]));
  return {
    location: new URL(String(start.headers.location)),
    cookies,
    cleared: clear.cookies,
  };
}

describe('OIDC authorization request', () => {
  it('binds state, nonce and an S256 PKCE challenge to scoped cookies', async () => {
    const { location, cookies } = await startLogin();
    expect(location.origin + location.pathname).toBe(`${issuer}/authorize`);
    expect(location.searchParams.get('redirect_uri')).toBe(
      'https://tapiz.example.test/api/auth/oidc/callback',
    );
    expect(location.searchParams.get('scope')).toBe('openid profile email');
    expect(location.searchParams.get('state')).toBe(
      cookies['oidc_state'].value,
    );
    expect(location.searchParams.get('nonce')).toBe(
      cookies['oidc_nonce'].value,
    );
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('code_challenge')).toBe(
      createHash('sha256')
        .update(cookies['oidc_verifier'].value)
        .digest('base64url'),
    );
    for (const name of ['oidc_state', 'oidc_nonce', 'oidc_verifier']) {
      expect(cookies[name]).toMatchObject({
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        path: '/api/auth/oidc/callback',
        maxAge: 600,
      });
      expect(cookies[name].value.length).toBeGreaterThanOrEqual(43);
    }
  });

  it('scopes the cookies to the callback when the API has a path prefix', async () => {
    vi.stubEnv('API_URL', 'https://example.test/tapiz/api');
    const { cookies, cleared } = await startLogin();
    expect(cookies['oidc_state'].path).toBe('/tapiz/api/auth/oidc/callback');
    expect(cleared).toHaveLength(3);
    for (const cookie of cleared) {
      expect(cookie.path).toBe('/tapiz/api/auth/oidc/callback');
    }
  });

  it('marks a callback from an older login attempt as stale', async () => {
    vi.mocked(oidc.discovery).mockClear();
    const error = await oidcIdentity({
      query: { code: 'abc', state: 'older-state' },
      cookies: {
        oidc_state: 'newer-state',
        oidc_nonce: 'nonce',
        oidc_verifier: 'verifier',
      },
    } as unknown as Parameters<typeof oidcIdentity>[0]).catch((e) => e);
    expect(error).toMatchObject({
      message: 'Invalid OIDC authorization response',
      staleOidcState: true,
    });
    expect(oidc.discovery).not.toHaveBeenCalled();
  });
});
