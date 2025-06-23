import { inferAsyncReturnType } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { getUser } from './db/user-db.js';
import { lucia, validateSession } from './auth.js';
import { FastifyInstance } from 'fastify';

// // prevent angular build errors
import '@fastify/rate-limit';
import '@fastify/cookie';

export async function createAuthContext({
  req,
  res,
}: CreateFastifyContextOptions) {
  async function getUserFromHeader() {
    const cookies = req.cookies;

    const sessionId = cookies[lucia.sessionCookieName];

    if (sessionId) {
      const { session, user } = await validateSession(sessionId);

      if (!user) {
        return null;
      }

      try {
        if (session && session.fresh) {
          const sessionCookie = lucia.createSessionCookie(session.id);

          res.setCookie(
            sessionCookie.name,
            sessionCookie.value,
            sessionCookie.attributes,
          );
        }

        if (!session) {
          const sessionCookie = lucia.createBlankSessionCookie();
          res.setCookie(
            sessionCookie.name,
            sessionCookie.value,
            sessionCookie.attributes,
          );
        }
      } catch (err) {
        console.error('Error setting session cookie', err);
        return null;
      }

      const dbUser = await getUser(user.id);

      if (!dbUser) {
        return null;
      }

      return {
        sub: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.picture,
      };
    }

    return null;
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
  { req, res }: CreateFastifyContextOptions,
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
