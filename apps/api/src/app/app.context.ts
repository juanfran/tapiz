import { inferAsyncReturnType } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { getUser, getUserByApiTokenHash } from './db/user-db.js';
import { lucia, validateSession } from './auth.js';
import { FastifyInstance } from 'fastify';
import { hashApiToken, isApiToken } from './api-token.js';

// // prevent angular build errors
import '@fastify/rate-limit';
import '@fastify/cookie';

export async function createAuthContext({
  req,
  res,
}: CreateFastifyContextOptions) {
  function toAuthUser(dbUser: Awaited<ReturnType<typeof getUser>>) {
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

  async function getUserFromSessionCookie() {
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

      return toAuthUser(dbUser);
    }

    return null;
  }

  async function getUserFromApiToken() {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!isApiToken(token)) {
      return null;
    }

    const dbUser = await getUserByApiTokenHash(hashApiToken(token));

    return toAuthUser(dbUser);
  }

  const user =
    (await getUserFromSessionCookie()) ?? (await getUserFromApiToken());

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
