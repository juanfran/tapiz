import WebSocket from 'ws';

import { startWsServer } from '../app/ws-server';
import { startDB } from '../app/db/init-db';
import { BoardCommonActions } from '@team-up/board-commons';
import * as http from 'http';
import { createMultipleUsers, getAuth, getUserCaller } from './test-helpers';
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
    server.listen(8000);

    startWsServer(server);
  });

  beforeAll((done) => {
    ws = new WebSocket(`ws://localhost:8000`, {
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

    expect(board?.visible).toEqual(false);
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

    it('set visibility', async () => {
      const action = {
        visible: true,
        type: BoardCommonActions.setVisible,
      };

      await send(action);

      const account = await getBoardUser(board1, getAuth(1).sub);

      expect(account?.visible).toBe(true);
      expect(ws.OPEN).toEqual(WebSocket.OPEN);
    });
  });
});
