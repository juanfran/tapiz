import type { WebSocket } from 'ws';
import { z } from 'zod';

const msgSchema = z.object({
  type: z.union([z.literal('board'), z.literal('team'), z.literal('user')]),
  ids: z.string().array(),
  clientId: z.string(),
});

export function Subscriptor(connection: WebSocket, connectionUserId: string) {
  let boardIds = new Set<string>();
  let teamIds = new Set<string>();
  let clientId = '';

  connection.on('message', (data: string) => {
    try {
      const message = JSON.parse(data);
      const messageResult = msgSchema.parse(message);

      const { type, ids } = messageResult;

      clientId = messageResult.clientId;

      if (type === 'board') {
        boardIds = new Set(ids);
      } else if (type === 'team') {
        teamIds = new Set(ids);
      }
    } catch {
      connection.close();
    }
  });

  return {
    checkBoard(boardId: string, correlationId: string) {
      if (clientId === correlationId) {
        return;
      }

      if (boardIds.has(boardId)) {
        connection.send(JSON.stringify({ type: 'board', id: boardId }));
      }
    },
    checkTeam(teamId: string, correlationId: string) {
      if (clientId === correlationId) {
        return;
      }

      if (teamIds.has(teamId)) {
        connection.send(JSON.stringify({ type: 'team', id: teamId }));
      }
    },
    checkUser(userId: string) {
      if (userId === connectionUserId) {
        connection.send(JSON.stringify({ type: 'user' }));
      }
    },
  };
}

const subscriptors = new Set<ReturnType<typeof Subscriptor>>();

export const newSubscriptorConnection = (
  connection: WebSocket,
  userId: string,
) => {
  const subscriptor = Subscriptor(connection, userId);
  subscriptors.add(subscriptor);

  connection.on('close', () => {
    subscriptors.delete(subscriptor);
  });
};

export const triggerBoard = (boardId: string, correlationId: string) => {
  for (const subscriptor of subscriptors) {
    subscriptor.checkBoard(boardId, correlationId);
  }
};

export const triggerTeam = (teamId: string, correlationId: string) => {
  for (const subscriptor of subscriptors) {
    subscriptor.checkTeam(teamId, correlationId);
  }
};

export const triggerUser = (userId: string) => {
  for (const subscriptor of subscriptors) {
    subscriptor.checkUser(userId);
  }
};
