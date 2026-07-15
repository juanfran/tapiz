import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod/v4';

export interface AgentAuthEnvironment {
  [key: string]: string | undefined;
  AI_AGENT_LOGIN_ENABLED?: string;
  FRONTEND_URL?: string;
  NODE_ENV?: string;
}

interface AgentSessionRouteDependencies {
  environment: AgentAuthEnvironment;
  authenticateApiToken: (
    authorization: string | undefined,
  ) => Promise<{ id: string } | null | undefined>;
  haveBoardAccess: (boardId: string, userId: string) => Promise<boolean>;
  createSessionCookie: (userId: string) => Promise<{
    name: string;
    value: string;
    attributes: Parameters<FastifyReply['setCookie']>[2];
  }>;
}

const agentLoginBody = z.object({
  boardId: z.string().uuid(),
});

function isLocalAgentLoginEnabled(environment: AgentAuthEnvironment) {
  return (
    environment.NODE_ENV?.toLowerCase() === 'development' &&
    environment.AI_AGENT_LOGIN_ENABLED === 'true'
  );
}

export function registerAgentSessionRoute(
  fastify: FastifyInstance,
  dependencies: AgentSessionRouteDependencies,
) {
  if (!isLocalAgentLoginEnabled(dependencies.environment)) {
    return;
  }

  fastify.post('/api/agent/session', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');

    const user = await dependencies.authenticateApiToken(
      request.headers.authorization,
    );

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const parsedBody = agentLoginBody.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(400).send({ error: 'Invalid request' });
    }

    const { boardId } = parsedBody.data;
    if (!(await dependencies.haveBoardAccess(boardId, user.id))) {
      return reply.status(403).send({ error: 'Board access denied' });
    }

    const sessionCookie = await dependencies.createSessionCookie(user.id);
    reply.setCookie(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );

    return reply.send({
      boardId,
      userId: user.id,
      loginUrl: `${dependencies.environment.FRONTEND_URL}/login-redirect`,
      boardUrl: `${dependencies.environment.FRONTEND_URL}/board/${boardId}`,
    });
  });
}
