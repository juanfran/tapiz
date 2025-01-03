import { TRPCError } from '@trpc/server';
import { randEmail, randFirstName, randUuid } from '@ngneat/falso';
import { appRouter } from '../app/routers/index.js';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyIO from 'fastify-socket.io';
import { initTRPC } from '@trpc/server';
import { Server } from '../app/server.js';
import db from '../app/db/index.js';
import { io } from 'socket.io-client';

const t = initTRPC.context().create();

const { createCallerFactory } = t;

export async function errorCall(call: () => Promise<unknown>) {
  try {
    await call();
  } catch (err) {
    if (err instanceof TRPCError) {
      return err;
    }
  }

  return null;
}

export const usersTest = [...Array(100)].map(() => {
  return {
    id: randUuid(),
    name: randFirstName(),
    email: randEmail(),
    googleId: randUuid(),
  };
});

export const getAuth = (userIndex: number) => {
  return {
    sub: usersTest[userIndex].id,
    name: usersTest[userIndex].name,
    email: usersTest[userIndex].email,
    googleId: usersTest[userIndex].googleId,
  };
};

export const createUser = async (userIndex: number) => {
  const auth = getAuth(userIndex);

  await db.user.createUser(auth.sub, auth.name, auth.email, '', auth.googleId);
};

export const createMultipleUsers = async (size = usersTest.length) => {
  for (let index = 0; index < size; index++) {
    await createUser(index);
  }
};

export const getUserCaller = (userIndex: number) => {
  const createCaller = createCallerFactory(appRouter);

  return createCaller({
    user: getAuth(userIndex),
  });
};

export const initTestServer = (port: number): Promise<Server> => {
  return new Promise((resolve) => {
    const fastify = Fastify({
      logger: true,
      maxParamLength: 5000,
    });

    fastify.register(fastifyCookie, {
      hook: 'onRequest',
      parseOptions: {},
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fastify.register(fastifyIO as any);

    const server = new Server(fastify.io);

    fastify.listen({ port }, (err) => {
      if (err) throw err;

      console.log(`http://localhost:${port}`);
      resolve(server);
    });
  });
};

export const initWs = (port: number): Promise<ReturnType<typeof io>> => {
  return new Promise((resolve) => {
    const ws = io(`ws://localhost:${port}/events`, {
      extraHeaders: {
        Cookie: 'auth=1',
      },
    });

    ws.on('connect', () => {
      resolve(ws);
    });

    ws.on('error', console.error);
  });
};
