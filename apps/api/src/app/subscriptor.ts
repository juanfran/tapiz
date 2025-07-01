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

  const currentUserClient = server.clients.find((it) => it.id === event.userId);

  currentUserClient?.socket.emit('user', event);
};
