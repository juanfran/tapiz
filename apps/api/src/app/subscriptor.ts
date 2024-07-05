import { getServer } from './global.js';

function send(prefix: string, triggerId: string, correlationId: string) {
  const server = getServer();
  if (!server) {
    return;
  }

  const currentUserClient = server.clients.find(
    (it) => it.correlationId === correlationId,
  );

  if (currentUserClient) {
    server.io
      .to(`sub:${prefix}:${triggerId}`)
      .except(currentUserClient?.socket.id)
      .emit(`sub:refresh:${prefix}`, triggerId);
  } else {
    server.io
      .to(`sub:${prefix}:${triggerId}`)
      .emit(`sub:refresh:${prefix}`, triggerId);
  }
}

export const triggerBoard = (boardId: string, correlationId: string) => {
  send('board', boardId, correlationId);
};

export const triggerTeam = (teamId: string, correlationId: string) => {
  send('team', teamId, correlationId);
};

export const triggerUser = (userId: string) => {
  const server = getServer();
  if (!server) {
    return;
  }

  const currentUserClient = server.clients.find((it) => it.id === userId);

  currentUserClient?.socket.emit('sub:refresh:user');
};
