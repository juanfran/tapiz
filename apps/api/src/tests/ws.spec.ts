import WebSocket from 'ws';

import { startDB } from '../app/db/init-db';
import {
  createMultipleUsers,
  getAuth,
  getUserCaller,
  initTestServer,
} from './test-helpers';
import { getBoardUser } from '../app/db/board-db';

describe('ws', () => {
  let ws: WebSocket;
  const port = 8011;

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
    await initTestServer(port);
  });

  beforeAll((done) => {
    ws = new WebSocket(`ws://localhost:${port}/events`, {
      headers: {
        Cookie: 'auth=1',
      },
    });
    ws.on('open', done);
    ws.on('error', console.error);
  });

  it('invialid msg', async () => {
    await ws.send('something');

    expect(ws.OPEN).toEqual(WebSocket.OPEN);
  });

  it('join', async () => {
    const caller = await getUserCaller(1);

    const board1 = await caller.board.create({
      name: 'board 1',
    });

    await send({ action: 'join', boardId: board1.id });

    const board = await getBoardUser(board1.id, getAuth(1).sub);

    expect(board).toBeTruthy();
    expect(ws.OPEN).toEqual(WebSocket.OPEN);
  });
});
