import Fastify from 'fastify';
import { createContext } from './auth.context.js';
import { AppRouter, appRouter } from './routers/index.js';
import fastifyCookie from '@fastify/cookie';
import cors from '@fastify/cors';
import ws from '@fastify/websocket';

import {
  fastifyTRPCPlugin,
  FastifyTRPCPluginOptions,
} from '@trpc/server/adapters/fastify';
import { Server } from './server.js';
import { newSubscriptorConnection } from './subscriptor.js';
import { setServer } from './global.js';
import { getAuthUrl, lucia, validateSession } from './auth.js';
import { googleCallback } from './routers/auth-routes.js';

const fastify = Fastify({
  logger: false,
  maxParamLength: 5000,
});

await fastify.register(import('@fastify/rate-limit'), {
  max: 150,
  timeWindow: '1 minute',
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

      setServer(server);
    }

    server.connection(connection, req);
  });

  fastify.get('/sub', { websocket: true }, async (connection, req) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookies = (req as any).cookies;
    const sessionId = cookies[lucia.sessionCookieName];

    if (!sessionId) {
      connection.close();
      return;
    }

    const { user } = await validateSession(sessionId);

    if (!user) {
      connection.close();
      return;
    }

    newSubscriptorConnection(connection, user.id);
  });

  fastify.get('/api/auth', async (req, rep) => {
    const authUrl = await getAuthUrl(rep);

    return rep.redirect(authUrl.href);
  });

  fastify.register(googleCallback);
});

const port = 8000;

export function startApiServer() {
  fastify.listen({ port }, (err) => {
    if (err) throw err;

    console.log(`http://localhost:${port}`);
  });
}
