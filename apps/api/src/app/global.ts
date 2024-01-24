import db from './db/index.js';
import { type Server } from './server.js';

let server: Server | null = null;

export function setServer(s: Server) {
  server = s;
}

export function getServer() {
  return server;
}

export function checkBoardAccess(boardId: string) {
  server?.clients
    .filter((client) => client.boardId === boardId)
    .forEach(async (client) => {
      const haveAccess = await db.board.haveAccess(boardId, client.id);

      if (!haveAccess) {
        client.noAccessClose();
      }
    });
}

export function revokeBoardAccess(boardId: string) {
  server?.clients
    .filter((client) => client.boardId === boardId)
    .forEach(async (client) => {
      client.noAccessClose();
    });
}
