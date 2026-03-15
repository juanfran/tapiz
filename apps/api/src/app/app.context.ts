import { inferAsyncReturnType } from '@trpc/server';
import { getUser } from './db/user-db.js';
import { validateSession } from './auth.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// // prevent angular build errors
import '@fastify/rate-limit';
import '@fastify/cookie';

interface ContextOptions {
  req: FastifyRequest;
  res: FastifyReply;
}

export async function createAuthContext({ req }: ContextOptions) {
  async function getUserFromHeader() {
    const cookieHeader = req.headers.cookie ?? '';

    if (!cookieHeader) {
      return null;
    }

    try {
      const session = await validateSession(cookieHeader);

      if (!session?.user) {
        return null;
      }

      const dbUser = await getUser(session.user.id);

      if (!dbUser) {
        return null;
      }

      return {
        sub: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.image,
      };
    } catch (err) {
      console.error('Error validating session', err);
      return null;
    }
  }

  const user = await getUserFromHeader();

  return {
    user,
    correlationId: req.headers['correlation-id'] as string,
  };
}

export async function createAppContext(
  app: FastifyInstance,
  rateLimits: Record<string, ReturnType<FastifyInstance['createRateLimit']>>,
  { req, res }: ContextOptions,
) {
  const authContext = await createAuthContext({ req, res });

  return {
    req,
    res,
    app,
    rateLimits,
    ...authContext,
  };
}
export type AppContext = inferAsyncReturnType<typeof createAppContext>;
