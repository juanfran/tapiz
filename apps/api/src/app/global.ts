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
      void client.refreshAccess();
    });
}

export function checkTeamBoardsAccess(teamId: string) {
  server?.clients
    .filter((client) => client.teamId === teamId)
    .forEach(async (client) => {
      void client.refreshAccess();
    });
}

export function revokeBoardAccess(boardId: string) {
  server?.clients
    .filter((client) => client.boardId === boardId)
    .forEach(async (client) => {
      client.noAccessClose();
    });
}
