import { inferAsyncReturnType } from '@trpc/server';
import { verifyToken } from './auth';
import cookieParser from 'cookie-parser';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';

export async function createContext({ req }: CreateExpressContextOptions) {
  async function getUserFromHeader() {
    const cookies = cookieParser.JSONCookies(req.cookies);
    if (cookies['auth'] && typeof cookies['auth'] === 'string') {
      return await verifyToken(cookies['auth']);
    }

    return null;
  }
  const user = await getUserFromHeader();

  return {
    user,
  };
}
export type AuthContext = inferAsyncReturnType<typeof createContext>;
