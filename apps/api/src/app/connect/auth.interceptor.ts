import type { Interceptor } from '@connectrpc/connect';
import { ConnectError, Code } from '@connectrpc/connect';
import { validateSession } from '../auth.js';
import { getUser } from '../db/user-db.js';

export interface AuthUser {
  sub: string;
  name: string;
  email: string;
  picture: string | null;
}

const userContextMap = new WeakMap<object, AuthUser>();

export function getUserFromContext(req: object): AuthUser {
  const user = userContextMap.get(req);
  if (!user) throw new ConnectError('Unauthorized', Code.Unauthenticated);
  return user;
}

export const authInterceptor: Interceptor = (next) => async (req) => {
  const cookieHeader =
    req.header.get('cookie') ?? '';

  if (!cookieHeader) {
    throw new ConnectError('Unauthorized', Code.Unauthenticated);
  }

  const session = await validateSession(cookieHeader);
  if (!session?.user) {
    throw new ConnectError('Unauthorized', Code.Unauthenticated);
  }

  const dbUser = await getUser(session.user.id);
  if (!dbUser) {
    throw new ConnectError('Unauthorized', Code.Unauthenticated);
  }

  userContextMap.set(req, {
    sub: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    picture: dbUser.image,
  });

  return next(req);
};
