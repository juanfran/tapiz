import { type Server } from './server.js';

let server: Server | null = null;

export function setServer(s: Server) {
  server = s;
}

export function getServer() {
  return server;
}

// Clients still joining a board are included too: their pending joins are
// marked stale synchronously (so they re-check access before publishing
// anything), and the refresh or revocation is queued after the join.

export function checkBoardAccess(boardId: string) {
  server?.clients
    .filter(
      (client) => client.boardId === boardId || client.hasPendingJoin(boardId),
    )
    .forEach((client) => {
      client.invalidatePendingJoins(boardId);
      void client.refreshAccess();
    });
}

export function checkTeamBoardsAccess(teamId: string) {
  server?.clients
    .filter((client) => client.teamId === teamId || client.hasPendingJoin())
    .forEach((client) => {
      client.invalidatePendingJoins();
      void client.refreshAccess();
    });
}

export function revokeBoardAccess(boardId: string) {
  server?.clients
    .filter(
      (client) => client.boardId === boardId || client.hasPendingJoin(boardId),
    )
    .forEach((client) => {
      client.invalidatePendingJoins(boardId);
      void client.revokeBoard(boardId);
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
