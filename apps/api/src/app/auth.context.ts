import { inferAsyncReturnType } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { verifyToken } from './auth.js';

export async function createContext({ req }: CreateFastifyContextOptions) {
  async function getUserFromHeader() {
    const cookies = req.cookies;

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
