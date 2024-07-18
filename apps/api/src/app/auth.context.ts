import { inferAsyncReturnType } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { getUser } from './db/user-db.js';
import { lucia, validateSession } from './auth.js';

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  async function getUserFromHeader() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookies = (req as any).cookies;

    const sessionId = cookies[lucia.sessionCookieName];

    if (sessionId) {
      const { session, user } = await validateSession(sessionId);

      if (!user) {
        return null;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resAny = res as any;

        if (session && session.fresh) {
          const sessionCookie = lucia.createSessionCookie(session.id);

          resAny.setCookie(
            sessionCookie.name,
            sessionCookie.value,
            sessionCookie.attributes,
          );
        }

        if (!session) {
          const sessionCookie = lucia.createBlankSessionCookie();
          resAny.setCookie(
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
export type AuthContext = inferAsyncReturnType<typeof createContext>;
