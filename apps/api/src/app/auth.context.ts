import { inferAsyncReturnType } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { verifyToken } from './auth.js';

export async function createContext({ req }: CreateFastifyContextOptions) {
  async function getUserFromHeader() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookies = (req as any).cookies;

    if (cookies['auth'] && typeof cookies['auth'] === 'string') {
      return (await verifyToken(cookies['auth'])) ?? null;
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
