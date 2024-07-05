import { type Server } from 'socket.io';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DB_DATABASE: string;
      DB_HOST: string;
      DB_PASSWORD: string;
      DB_PORT_HOST: string;
      DB_USER: string;
      API_URL: string;
      API_HOST: string;
      API_PORT: string;
      FRONTEND_URL: string;
      GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;
    }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
}

export {};
