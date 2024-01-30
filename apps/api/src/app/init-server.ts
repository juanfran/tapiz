import Fastify from 'fastify';
import { createContext } from './auth.context.js';
import { appRouter } from './routers/index.js';
import fastifyCookie from '@fastify/cookie';
import cors from '@fastify/cors';
import ws from '@fastify/websocket';

import {
  fastifyTRPCPlugin,
  FastifyTRPCPluginOptions,
} from '@trpc/server/adapters/fastify';
import { Server } from './server.js';

export type AppRouter = typeof appRouter;

const fastify = Fastify({
  logger: false,
  maxParamLength: 5000,
});

fastify.register(fastifyCookie, {
  hook: 'onRequest',
  parseOptions: {},
});

fastify.register(fastifyTRPCPlugin, {
  prefix: '/api/trpc',
  trpcOptions: {
    router: appRouter,
    createContext,
    onError({ path, error }) {
      // report to error monitoring
      console.error(`Error in tRPC handler on path '${path}':`, error);
    },
  } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
});

fastify.register(cors, {
  credentials: true,
  origin: true,
});

fastify.register(ws);

fastify.register(async function (fastify) {
  let server: Server | null = null;

  fastify.get('/events', { websocket: true }, (connection, req) => {
    if (!server) {
      server = new Server();
    }

    server.connection(connection.socket, req);
  });
});

const port = 8000;

export function startApiServer() {
  fastify.listen({ port }, (err) => {
    if (err) throw err;

    console.log(`http://localhost:${port}`);
  });
}
