import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { googleCallback } from './auth-routes.js';
import {
  createUserSessionCookie,
  getUserInfo,
  validateAuthorizationCode,
} from '../auth.js';
import { getUserByGoogleId, updateUser } from '../db/user-db.js';
import db from '../db/index.js';

vi.mock('../auth.js', () => ({
  createUserSessionCookie: vi.fn(),
  getUserInfo: vi.fn(),
  validateAuthorizationCode: vi.fn(),
}));
vi.mock('../db/user-db.js', () => ({
  getUserByGoogleId: vi.fn(),
  updateUser: vi.fn(),
}));
vi.mock('../db/index.js', () => ({
  default: { user: { createUser: vi.fn() } },
}));

async function callback() {
  const app = Fastify();
  await app.register(fastifyCookie);
  await app.register(googleCallback);
  const response = await app.inject({
    url: '/api/auth/callback?code=authorization-code&state=expected',
    headers: { cookie: 'state=expected; code_verifier=verifier' },
  });
  await app.close();
  return response;
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env['FRONTEND_URL'] = 'http://localhost:4300';
  vi.mocked(validateAuthorizationCode).mockResolvedValue({
    accessToken: 'token',
  } as Awaited<ReturnType<typeof validateAuthorizationCode>>);
  vi.mocked(getUserInfo).mockResolvedValue({
    sub: 'google-sub',
    email: 'Person@Example.test',
    email_verified: true,
    name: 'Person',
    picture: '',
  } as Awaited<ReturnType<typeof getUserInfo>>);
  vi.mocked(createUserSessionCookie).mockResolvedValue({
    name: 'session',
    value: 'session-value',
    attributes: { path: '/', httpOnly: true },
  } as Awaited<ReturnType<typeof createUserSessionCookie>>);
});

describe('Google callback with an OIDC email collision', () => {
  it('rejects a first-login collision without creating a session', async () => {
    vi.mocked(db.user.createUser).mockRejectedValue({ code: '23505' });
    const response = await callback();
    expect(response.statusCode).toBe(409);
    expect(
      response.cookies.find((cookie) => cookie.name === 'session'),
    ).toBeUndefined();
    expect(createUserSessionCookie).not.toHaveBeenCalled();
  });

  it('updates a returning user before creating a session', async () => {
    vi.mocked(getUserByGoogleId).mockResolvedValue({
      id: 'existing',
    } as Awaited<ReturnType<typeof getUserByGoogleId>>);
    const response = await callback();
    expect(response.statusCode).toBe(302);
    expect(vi.mocked(updateUser).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(createUserSessionCookie).mock.invocationCallOrder[0],
    );
  });

  it('rejects a returning-user collision without leaving a session cookie', async () => {
    vi.mocked(getUserByGoogleId).mockResolvedValue({
      id: 'existing',
    } as Awaited<ReturnType<typeof getUserByGoogleId>>);
    vi.mocked(updateUser).mockRejectedValue({ code: '23505' });
    const response = await callback();
    expect(response.statusCode).toBe(409);
    expect(
      response.cookies.find((cookie) => cookie.name === 'session'),
    ).toBeUndefined();
    expect(createUserSessionCookie).not.toHaveBeenCalled();
  });
});

describe('Google callback email verification', () => {
  it.each([false, undefined])(
    'rejects email_verified=%s without creating an account or session',
    async (emailVerified) => {
      vi.mocked(getUserInfo).mockResolvedValue({
        sub: 'google-sub',
        email: 'victim@example.test',
        email_verified: emailVerified,
        name: 'Squatter',
        picture: '',
      } as Awaited<ReturnType<typeof getUserInfo>>);
      const response = await callback();
      expect(response.statusCode).toBe(400);
      expect(db.user.createUser).not.toHaveBeenCalled();
      expect(updateUser).not.toHaveBeenCalled();
      expect(createUserSessionCookie).not.toHaveBeenCalled();
    },
  );
});
