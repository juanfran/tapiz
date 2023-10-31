import WebSocket from 'ws';

import { startWsServer } from '../app/ws-server';
import { startDB } from '../app/db/init-db';
import * as http from 'http';
import { createMultipleUsers, getAuth, getUserCaller } from './test-helpers';
import { getBoardUser } from '../app/db/board-db';
import { Server } from '../app/server';

jest.mock('../app/auth', () => {
  return {
    verifyToken: (id: string) => {
      const auth = getAuth(Number(id));

      return Promise.resolve(auth);
    },
  };
});

describe('ws', () => {
  let ws: WebSocket;
  let wsServer: Server;
  const port = 8001;

  const send = (obj: unknown) => {
    return new Promise((resolve) => {
      ws.send(JSON.stringify(obj), (err) => {
        setTimeout(() => {
          resolve(err);
        }, 100); // wait for ws & db
      });
    });
  };

  beforeAll(async () => {
    await startDB();
    await createMultipleUsers();

    const server = http.createServer();
    server.listen(port);

    wsServer = startWsServer(server);
  });

  function onClose() {
    return new Promise((resolve) => {
      ws.on('close', () => {
        resolve(null);
      });
    });
  }

  beforeAll((done) => {
    ws = new WebSocket(`ws://localhost:${port}`, {
      headers: {
        Cookie: 'auth=1',
      },
    });
    ws.on('open', done);
    ws.on('error', console.error);
  });

  it('join & leave free memory', async () => {
    const caller = await getUserCaller(1);

    const board1 = await caller.board.create({
      name: 'board 1',
    });

    await send({ action: 'join', boardId: board1.id });

    const board = await getBoardUser(board1.id, getAuth(1).sub);

    expect(board?.accountId).toBeTruthy();
    expect(ws.OPEN).toEqual(WebSocket.OPEN);
    expect(wsServer.clients.length).toEqual(1);
    expect(wsServer.getBoard(board1.id)).toBeTruthy();

    ws.close();

    await onClose();

    expect(wsServer.clients.length).toEqual(0);
    expect(wsServer.getBoard(board1.id)).toBeFalsy();
  });
});
