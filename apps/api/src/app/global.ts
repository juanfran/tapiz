import { type Server } from './server.js';

let server: Server | null = null;

export function setServer(s: Server) {
  server = s;
}

export function getServer() {
  return server;
}

// A client still joining a board is included through `pendingBoardId`: its
// refresh or revocation is queued after the join, so a change committed while
// the join was checking access is never missed.

export function checkBoardAccess(boardId: string) {
  server?.clients
    .filter(
      (client) =>
        client.boardId === boardId || client.pendingBoardId === boardId,
    )
    .forEach((client) => void client.refreshAccess());
}

export function checkTeamBoardsAccess(teamId: string) {
  server?.clients
    .filter((client) => client.teamId === teamId || client.pendingBoardId)
    .forEach((client) => void client.refreshAccess());
}

export function revokeBoardAccess(boardId: string) {
  server?.clients
    .filter(
      (client) =>
        client.boardId === boardId || client.pendingBoardId === boardId,
    )
    .forEach((client) => void client.revokeBoard(boardId));
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
