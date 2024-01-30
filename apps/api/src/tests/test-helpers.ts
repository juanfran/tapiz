import { TRPCError } from '@trpc/server';
import { randEmail, randFirstName, randUuid } from '@ngneat/falso';
import { appRouter } from '../app/routers/index.js';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import ws from '@fastify/websocket';
import { Server } from '../app/server.js';

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
  };
});

export const getAuth = (userIndex: number) => {
  return {
    sub: usersTest[userIndex].id,
    name: usersTest[userIndex].name,
    email: usersTest[userIndex].email,
  };
};

export const createUser = async (userIndex: number) => {
  const caller = getUserCaller(userIndex);

  await caller.user.login();
};

export const createMultipleUsers = async (size = usersTest.length) => {
  for (let index = 0; index < size; index++) {
    await createUser(index);
  }
};

export const getUserCaller = (userIndex: number) => {
  return appRouter.createCaller({
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

    fastify.register(ws);

    const server = new Server();

    fastify.register(async function (fastify) {
      fastify.get('/events', { websocket: true }, (connection, req) => {
        server.connection(connection.socket, req);
      });
    });

    fastify.listen({ port }, (err) => {
      if (err) throw err;

      console.log(`http://localhost:${port}`);
      resolve(server);
    });
  });
};
