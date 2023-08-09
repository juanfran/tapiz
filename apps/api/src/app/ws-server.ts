import { Server } from './server';
import { Server as HTTPServer } from 'http';
import { Server as HTTPSServer } from 'https';

export function startWsServer(httpServer: HTTPServer | HTTPSServer) {
  const server = new Server();
  server.start(httpServer);

  return server;
}
