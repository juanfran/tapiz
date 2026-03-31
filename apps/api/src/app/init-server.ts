import Fastify from 'fastify';
import { createAppContext } from './app.context.js';
import { AppRouter, appRouter } from './routers/index.js';
import fastifyCookie from '@fastify/cookie';
import cors from '@fastify/cors';
import fastifyIO from 'fastify-socket.io';
import { parse } from 'cookie';
import customParser from 'socket.io-msgpack-parser';

import {
  fastifyTRPCPlugin,
  FastifyTRPCPluginOptions,
} from '@trpc/server/adapters/fastify';
import { Server } from './server.js';
import { setServer } from './global.js';
import { getAuthUrl, lucia } from './auth.js';
import { googleCallback } from './routers/auth-routes.js';
import { fileUpload } from './file-upload.js';

const fastify = Fastify({
  logger: false,
  maxParamLength: 5000,
});

await fastify.register(import('@fastify/rate-limit'), {
  max: 150,
  timeWindow: '1 minute',
  keyGenerator: (req) => {
    return req.cookies[lucia.sessionCookieName] || req.ip;
  },
});

const rateLimits = {
  mentionBoardUser: fastify.createRateLimit({
    max: 50,
    timeWindow: '1 minute',
  }),
};

fastify.register(fileUpload);

fastify.register(fastifyCookie, {
  hook: 'onRequest',
  parseOptions: {},
});

fastify.register(fastifyTRPCPlugin, {
  prefix: '/api/trpc',
  trpcOptions: {
    router: appRouter,
    createContext: ({ req, res }) => {
      return createAppContext(fastify, rateLimits, {
        req,
        res,
      });
    },
    onError({ path, error }) {
      console.error(`Error in tRPC handler on path '${path}':`, error);
    },
  } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
});

fastify.register(cors, {
  credentials: true,
  origin: true,
});

// https://github.com/ducktors/fastify-socket.io/issues/36
// eslint-disable-next-line @typescript-eslint/no-explicit-any
fastify.register(fastifyIO as any, {
  connectionStateRecovery: {
    // the backup duration of the sessions and the packets
    maxDisconnectionDuration: 2 * 60 * 1000,
    // whether to skip middlewares upon successful recovery
    skipMiddlewares: true,
  },
  cors: {
    credentials: true,
    origin: process.env['FRONTEND_URL'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
  parser: customParser,
});

fastify.register(async function (fastify) {
  let server: Server | null = null;

  fastify.ready((err) => {
    if (err) throw err;

    fastify.io.on('connection', (socket) => {
      if (!server) {
        server = new Server(fastify.io);
        setServer(server);
      }

      server.connection(socket, parse(socket.request.headers.cookie ?? ''));
    });
  });

  fastify.get('/api/auth', async (req, rep) => {
    const authUrl = await getAuthUrl(rep);

    return rep.redirect(authUrl.href);
  });

  fastify.register(googleCallback);
});

const host = process.env['API_HOST'];

export function startApiServer() {
  fastify.listen(
    {
      port: Number(process.env['API_PORT']),
      host: host === 'localhost' ? '0.0.0.0' : host,
    },
    (err) => {
      if (err) throw err;

      console.log(`http://localhost:${process.env['API_PORT']}`);
    },
  );
}

// process.on('uncaughtException', (err) => {
//   console.error('❌ Uncaught Exception:', err);
// });

// process.on('unhandledRejection', (reason, promise) => {
//   console.error('⚠️ Unhandled Rejection:', reason);
// });
