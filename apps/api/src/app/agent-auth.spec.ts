import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { describe, expect, it, vi } from 'vitest';
import {
  registerAgentSessionRoute,
  type AgentAuthEnvironment,
} from './agent-auth.js';

const enabledEnvironment: AgentAuthEnvironment = {
  AI_AGENT_LOGIN_ENABLED: 'true',
  FRONTEND_URL: 'http://localhost:4300',
  NODE_ENV: 'development',
};

const user = { id: 'user-1' };
const apiToken = 'tapiz_pat_a-valid-personal-api-token';

async function createServer(
  environment: AgentAuthEnvironment,
  overrides: Partial<Parameters<typeof registerAgentSessionRoute>[1]> = {},
) {
  const fastify = Fastify();
  await fastify.register(fastifyCookie);

  const dependencies = {
    environment,
    authenticateApiToken: vi.fn().mockResolvedValue(user),
    haveBoardAccess: vi.fn().mockResolvedValue(true),
    createSessionCookie: vi.fn().mockResolvedValue({
      name: 'auth_session',
      value: 'session-id',
      attributes: { httpOnly: true, path: '/', sameSite: 'lax' as const },
    }),
    ...overrides,
  };

  registerAgentSessionRoute(fastify, dependencies);
  await fastify.ready();

  return { fastify, dependencies };
}

describe('local agent authentication', () => {
  it.each([
    [{ ...enabledEnvironment, AI_AGENT_LOGIN_ENABLED: 'false' }],
    [{ ...enabledEnvironment, NODE_ENV: 'production' }],
    [{ ...enabledEnvironment, NODE_ENV: 'test' }],
    [{ ...enabledEnvironment, NODE_ENV: undefined }],
  ])(
    'does not register the route outside safe local configuration',
    async (env) => {
      const { fastify } = await createServer(env);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/agent/session',
      });

      expect(response.statusCode).toBe(404);
      await fastify.close();
    },
  );

  it('rejects an invalid API token', async () => {
    const { fastify, dependencies } = await createServer(enabledEnvironment, {
      authenticateApiToken: vi.fn().mockResolvedValue(undefined),
    });

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/agent/session',
      headers: { authorization: 'Bearer invalid-token' },
      payload: {
        boardId: '4f94614d-7060-42e8-8382-30cc8062e72b',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(dependencies.authenticateApiToken).toHaveBeenCalledWith(
      'Bearer invalid-token',
    );
    expect(dependencies.createSessionCookie).not.toHaveBeenCalled();
    await fastify.close();
  });

  it('keeps the selected user subject to existing board permissions', async () => {
    const { fastify, dependencies } = await createServer(enabledEnvironment, {
      haveBoardAccess: vi.fn().mockResolvedValue(false),
    });

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/agent/session',
      headers: { authorization: `Bearer ${apiToken}` },
      payload: {
        boardId: '4f94614d-7060-42e8-8382-30cc8062e72b',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(dependencies.createSessionCookie).not.toHaveBeenCalled();
    await fastify.close();
  });

  it('creates a normal app session for an authorized existing user', async () => {
    const { fastify, dependencies } = await createServer(enabledEnvironment);
    const boardId = '4f94614d-7060-42e8-8382-30cc8062e72b';

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/agent/session',
      headers: { authorization: `Bearer ${apiToken}` },
      payload: { boardId },
    });

    expect(response.statusCode).toBe(200);
    expect(dependencies.authenticateApiToken).toHaveBeenCalledWith(
      `Bearer ${apiToken}`,
    );
    expect(dependencies.haveBoardAccess).toHaveBeenCalledWith(boardId, user.id);
    expect(dependencies.createSessionCookie).toHaveBeenCalledWith(user.id);
    expect(response.cookies).toContainEqual(
      expect.objectContaining({ name: 'auth_session', value: 'session-id' }),
    );
    expect(response.json()).toEqual({
      boardId,
      userId: user.id,
      loginUrl: 'http://localhost:4300/login-redirect',
      boardUrl:
        'http://localhost:4300/board/4f94614d-7060-42e8-8382-30cc8062e72b',
    });
    await fastify.close();
  });

  it('rejects requests without an API token', async () => {
    const { fastify, dependencies } = await createServer(enabledEnvironment, {
      authenticateApiToken: vi.fn().mockResolvedValue(undefined),
    });

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/agent/session',
      payload: {
        boardId: '4f94614d-7060-42e8-8382-30cc8062e72b',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(dependencies.authenticateApiToken).toHaveBeenCalledWith(undefined);
    expect(dependencies.createSessionCookie).not.toHaveBeenCalled();
    await fastify.close();
  });
});
