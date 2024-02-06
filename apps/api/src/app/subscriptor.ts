import type { WebSocket } from 'ws';
import { z } from 'zod';

const msgSchema = z.object({
  type: z.union([z.literal('board'), z.literal('team')]),
  ids: z.string().array(),
  clientId: z.string(),
});

export function Subscriptor(connection: WebSocket) {
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
      } else {
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
        connection.send(`{"type":"board","id":"${boardId}"}`);
      }
    },
    checkTeam(teamId: string, correlationId: string) {
      if (clientId === correlationId) {
        return;
      }

      if (teamIds.has(teamId)) {
        connection.send(`{"type":"team","id":"${teamId}"}`);
      }
    },
  };
}

const subscriptors = new Set<ReturnType<typeof Subscriptor>>();

export const newSubscriptorConnection = (connection: WebSocket) => {
  const subscriptor = Subscriptor(connection);
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
