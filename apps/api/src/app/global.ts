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
    .forEach((client) => {
      client.revokeBoard();
    });
}

/**
 * Re-checks the team and board event rooms of a user's sockets, for example
 * after they left a team, and leaves the ones they lost access to.
 */
export function revalidateUserSubscriptions(userId: string) {
  server?.clients
    .filter((client) => client.id === userId)
    .forEach((client) => {
      void client.revalidateSubscriptions();
    });
}

/** Disconnects every socket of a user, for example after account deletion. */
export function disconnectUser(userId: string) {
  server?.clients
    .filter((client) => client.id === userId)
    .forEach((client) => {
      client.unauthorizedClose();
    });
}
