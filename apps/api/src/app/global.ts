import { type Server } from './server.js';
import type { Client } from './client.js';

let server: Server | null = null;

export function setServer(s: Server) {
  server = s;
}

export function getServer() {
  return server;
}

/** Re-checks a client's board access; one that can't be verified is revoked. */
function refreshClientAccess(client: Client) {
  client.refreshAccess().catch((error: unknown) => {
    console.error('Board access check failed', error);
    client.revokeBoard();
  });
}

export function checkBoardAccess(boardId: string) {
  server?.clients
    .filter((client) => client.boardId === boardId)
    .forEach(refreshClientAccess);
}

export function checkTeamBoardsAccess(teamId: string) {
  server?.clients
    .filter((client) => client.teamId === teamId)
    .forEach(refreshClientAccess);
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
