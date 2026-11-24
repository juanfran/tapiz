import { getServer } from './global.js';
import {
  UserWsEvents,
  WsEvents,
} from '@tapiz/board-commons/models/ws-events.model.js';

export function sendEvent(event: WsEvents, correlationId: string) {
  const server = getServer();
  if (!server) {
    return;
  }

  const currentUserClient = server.clients.find(
    (it) => it.correlationId === correlationId,
  );

  if (currentUserClient) {
    server.io
      .to(event.room)
      .except(currentUserClient?.socket.id)
      .emit(event.room, event);
  } else {
    server.io.to(event.room).emit(event.room, event);
  }
}

export const sendUserEvent = (event: UserWsEvents) => {
  const server = getServer();
  if (!server) {
    return;
  }

  // Every tab of the user, not only the first connected socket.
  server.clients
    .filter((it) => it.id === event.userId)
    .forEach((client) => client.socket.emit('user', event));
};
