import Fastify from 'fastify';
import { createAppContext } from './app.context.js';
import { AppRouter, appRouter } from './routers/index.js';
import fastifyCookie from '@fastify/cookie';
import cors from '@fastify/cors';
import fastifyIO from 'fastify-socket.io';
import customParser from 'socket.io-msgpack-parser';

import {
  fastifyTRPCPlugin,
  FastifyTRPCPluginOptions,
} from '@trpc/server/adapters/fastify';
import { Server } from './server.js';
import { setServer } from './global.js';
import { getAuth } from './auth.js';
import { toNodeHandler } from 'better-auth/node';
import { fileUpload } from './file-upload.js';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from './yjs-server.js';
import { validateSession } from './auth.js';
import { haveAccess } from './db/board-db.js';

const fastify = Fastify({
  logger: false,
  maxParamLength: 5000,
});

await fastify.register(import('@fastify/rate-limit'), {
  max: 150,
  timeWindow: '1 minute',
  keyGenerator: (req) => {
    return req.cookies['better-auth.session_token'] || req.ip;
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
  origin: process.env['FRONTEND_URL'],
});

// https://github.com/ducktors/fastify-socket.io/issues/36
// eslint-disable-next-line @typescript-eslint/no-explicit-any
fastify.register(fastifyIO as any, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
  cors: {
    credentials: true,
    origin: process.env['FRONTEND_URL'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
  parser: customParser,
  // Tuned for high-concurrency boards: detect dead connections faster
  // while keeping overhead low for many simultaneous users
  pingTimeout: 15000,
  pingInterval: 10000,
  // Allow large board state payloads (default is 1MB)
  maxHttpBufferSize: 5 * 1024 * 1024,
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

      server.connection(socket, socket.request.headers.cookie ?? '');
    });
  });
});

// Better Auth handles all /api/auth/* routes (OAuth flows, session management)
fastify.register(async function (fastify) {
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => {
      done(null, body);
    },
  );

  fastify.all('/api/auth/*', (req, reply) => {
    return toNodeHandler(getAuth())(req.raw, reply.raw);
  });
});

const host = process.env['API_HOST'];

// Yjs WebSocket server on /yjs/:boardId
const yjsWss = new WebSocketServer({ noServer: true });

export function startApiServer() {
  fastify.listen(
    {
      port: Number(process.env['API_PORT']),
      host: host === 'localhost' ? '0.0.0.0' : host,
    },
    (err) => {
      if (err) throw err;

      console.log(`http://localhost:${process.env['API_PORT']}`);

      // Attach Yjs WebSocket upgrade handler to the underlying HTTP server
      const httpServer = fastify.server;
      httpServer.on('upgrade', async (request, socket, head) => {
        const url = new URL(
          request.url ?? '',
          `http://${request.headers.host}`,
        );

        if (!url.pathname.startsWith('/yjs/')) {
          return; // Let Socket.io handle other upgrades
        }

        const boardId = url.pathname.slice('/yjs/'.length);

        if (!boardId || boardId.length < 36) {
          socket.destroy();
          return;
        }

        // Authenticate via cookie
        const cookie = request.headers.cookie ?? '';
        try {
          const session = await validateSession(cookie);
          if (!session?.user) {
            socket.destroy();
            return;
          }

          const hasAccess = await haveAccess(boardId, session.user.id);
          if (!hasAccess) {
            socket.destroy();
            return;
          }

          yjsWss.handleUpgrade(request, socket, head, (ws) => {
            yjsWss.emit('connection', ws, request);
            setupWSConnection(ws, request, boardId);
          });
        } catch {
          socket.destroy();
        }
      });
    },
  );
}
