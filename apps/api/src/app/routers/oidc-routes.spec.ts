import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { oidcRoutes } from './oidc-routes.js';
import {
  clearOidcCookies,
  oidcAuthorizationUrl,
  oidcIdentity,
} from '../oidc.js';
import { createUserSessionCookie } from '../auth.js';
import {
  createOidcUser,
  getUserByOidcIdentity,
  refreshOidcUser,
} from '../db/user-db.js';

vi.mock('../oidc.js', async (importOriginal) => ({
  oidcAuthorizationUrl: vi.fn(),
  oidcIdentity: vi.fn(),
  clearOidcCookies: vi.fn(),
  isStaleOidcCallback: (await importOriginal<typeof import('../oidc.js')>())
    .isStaleOidcCallback,
}));
vi.mock('../auth.js', () => ({ createUserSessionCookie: vi.fn() }));
vi.mock('../db/user-db.js', () => ({
  createOidcUser: vi.fn(),
  getUserByOidcIdentity: vi.fn(),
  refreshOidcUser: vi.fn(),
}));

const identity = {
  issuer: 'https://idp.example.test/realms/example',
  subject: 'subject-123',
  email: 'person@example.test',
  name: 'Example User',
};

async function server() {
  const app = Fastify();
  await app.register(fastifyCookie);
  await app.register(oidcRoutes);
  await app.ready();
  return app;
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env['FRONTEND_URL'] = 'http://localhost:4300';
  vi.mocked(oidcIdentity).mockResolvedValue(identity);
  vi.mocked(refreshOidcUser).mockResolvedValue({
    id: 'user-1',
    email: identity.email,
  } as Awaited<ReturnType<typeof refreshOidcUser>>);
  vi.mocked(createUserSessionCookie).mockResolvedValue({
    name: 'session',
    value: 'session-id',
    attributes: { httpOnly: true, path: '/' },
  } as Awaited<ReturnType<typeof createUserSessionCookie>>);
});

describe('OIDC callback', () => {
  it('redirects to the provider for the authorization route', async () => {
    vi.mocked(oidcAuthorizationUrl).mockResolvedValue(
      new URL('https://idp.example.test/authorize'),
    );
    const app = await server();
    const response = await app.inject('/api/auth/oidc');
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe(
      'https://idp.example.test/authorize',
    );
    await app.close();
  });

  it('rejects a failed authorization response before creating a session', async () => {
    vi.mocked(oidcIdentity).mockRejectedValue(new Error('Invalid state'));
    const app = await server();
    const response = await app.inject('/api/auth/oidc/callback?state=wrong');
    expect(response.statusCode).toBe(400);
    expect(clearOidcCookies).toHaveBeenCalled();
    expect(createOidcUser).not.toHaveBeenCalled();
    expect(createUserSessionCookie).not.toHaveBeenCalled();
    await app.close();
  });

  it('keeps the cookies of a newer login attempt when the state is stale', async () => {
    vi.mocked(oidcIdentity).mockRejectedValue(
      Object.assign(new Error('Invalid OIDC authorization response'), {
        staleOidcState: true,
      }),
    );
    const app = await server();
    const response = await app.inject('/api/auth/oidc/callback?state=older');
    expect(response.statusCode).toBe(400);
    expect(clearOidcCookies).not.toHaveBeenCalled();
    expect(createUserSessionCookie).not.toHaveBeenCalled();
    await app.close();
  });

  it('uses the email as the display name when the provider sends no name', async () => {
    vi.mocked(oidcIdentity).mockResolvedValue({ ...identity, name: undefined });
    vi.mocked(getUserByOidcIdentity)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: 'user-1' } as Awaited<
        ReturnType<typeof getUserByOidcIdentity>
      >);
    const app = await server();
    const response = await app.inject('/api/auth/oidc/callback');
    expect(response.statusCode).toBe(302);
    expect(createOidcUser).toHaveBeenCalledWith(
      identity.issuer,
      identity.subject,
      identity.email,
      identity.email,
      undefined,
    );
    expect(refreshOidcUser).toHaveBeenCalledWith(
      identity.issuer,
      identity.subject,
      { email: identity.email, name: undefined, picture: undefined },
    );
    await app.close();
  });

  it('logs failures after the provider exchange as database errors', async () => {
    vi.mocked(getUserByOidcIdentity).mockRejectedValue(
      Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
        code: 'ECONNREFUSED',
      }),
    );
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const app = await server();
      const response = await app.inject('/api/auth/oidc/callback');
      expect(response.statusCode).toBe(400);
      expect(createUserSessionCookie).not.toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(
        'OIDC login failed: database error (ECONNREFUSED): Database operation failed',
      );
      await app.close();
    } finally {
      spy.mockRestore();
    }
  });

  it('creates a new identity and issues a session', async () => {
    vi.mocked(getUserByOidcIdentity)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: 'user-1' } as Awaited<
        ReturnType<typeof getUserByOidcIdentity>
      >);
    const app = await server();
    const response = await app.inject('/api/auth/oidc/callback');
    expect(createOidcUser).toHaveBeenCalledWith(
      identity.issuer,
      identity.subject,
      identity.name,
      identity.email,
      undefined,
    );
    expect(response.statusCode).toBe(302);
    expect(response.cookies).toContainEqual(
      expect.objectContaining({ name: 'session' }),
    );
    await app.close();
  });

  it('accepts a concurrent registration only for the same issuer and subject', async () => {
    vi.mocked(getUserByOidcIdentity)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: 'winner' } as Awaited<
        ReturnType<typeof getUserByOidcIdentity>
      >);
    vi.mocked(createOidcUser).mockRejectedValue({ code: '23505' });
    vi.mocked(refreshOidcUser).mockResolvedValue({
      id: 'winner',
    } as Awaited<ReturnType<typeof refreshOidcUser>>);
    const app = await server();
    const response = await app.inject('/api/auth/oidc/callback');
    expect(response.statusCode).toBe(302);
    expect(createUserSessionCookie).toHaveBeenCalledWith('winner');
    await app.close();
  });

  it('refreshes an existing identity email before creating its session', async () => {
    vi.mocked(getUserByOidcIdentity).mockResolvedValue({
      id: 'user-1',
      email: 'old@example.test',
    } as Awaited<ReturnType<typeof getUserByOidcIdentity>>);
    const app = await server();
    const response = await app.inject('/api/auth/oidc/callback');
    expect(response.statusCode).toBe(302);
    expect(refreshOidcUser).toHaveBeenCalledWith(
      identity.issuer,
      identity.subject,
      { email: identity.email, name: identity.name, picture: undefined },
    );
    expect(clearOidcCookies).toHaveBeenCalled();
    expect(createUserSessionCookie).toHaveBeenCalledWith('user-1');
    expect(vi.mocked(refreshOidcUser).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(createUserSessionCookie).mock.invocationCallOrder[0],
    );
    await app.close();
  });

  it('rejects an email collision on an existing identity without issuing a session', async () => {
    vi.mocked(getUserByOidcIdentity).mockResolvedValue({
      id: 'user-1',
      email: 'old@example.test',
    } as Awaited<ReturnType<typeof getUserByOidcIdentity>>);
    vi.mocked(refreshOidcUser).mockRejectedValue({ code: '23505' });
    const app = await server();
    const response = await app.inject('/api/auth/oidc/callback');
    expect(response.statusCode).toBe(409);
    expect(createUserSessionCookie).not.toHaveBeenCalled();
    await app.close();
  });

  it('rejects an email collision without linking an unrelated account', async () => {
    vi.mocked(getUserByOidcIdentity).mockResolvedValue(undefined);
    vi.mocked(createOidcUser).mockRejectedValue({ code: '23505' });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const app = await server();
      const response = await app.inject('/api/auth/oidc/callback');
      expect(response.statusCode).toBe(409);
      expect(createUserSessionCookie).not.toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(
        'OIDC login rejected: verified email already belongs to another account (409)',
      );
      expect(JSON.stringify(spy.mock.calls)).not.toContain(identity.email);
      await app.close();
    } finally {
      spy.mockRestore();
    }
  });
});
