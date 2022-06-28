import { Server } from './server';

export function startWsServer() {
  const server = new Server();
  server.start();
}
