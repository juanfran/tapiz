import WebSocket from 'ws';

import { startDB } from '../app/db/init-db';
import { BoardCommonActions } from '@team-up/board-commons';
import {
  createMultipleUsers,
  getAuth,
  getUserCaller,
  initTestServer,
} from './test-helpers';
import { getBoard, getBoardUser } from '../app/db/board-db';

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

  describe('work with board', () => {
    let board1: string;

    beforeAll(async () => {
      const caller = await getUserCaller(1);

      const board = await caller.board.create({
        name: 'board 1',
      });

      board1 = board.id;

      await send({ action: 'join', boardId: board1 });
    });

    it('set board name', async () => {
      const action = {
        name: 'new board name',
        type: BoardCommonActions.setBoardName,
      };

      await send(action);

      const boardResult = await getBoard(board1);

      expect(boardResult?.name).toEqual('new board name');
      expect(ws.OPEN).toEqual(WebSocket.OPEN);
    });
  });
});
