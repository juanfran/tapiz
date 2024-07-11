import { startDB } from '../app/db/init-db';
import {
  createMultipleUsers,
  getAuth,
  getUserCaller,
  initTestServer,
  initWs,
} from './test-helpers';
import { getBoardUser } from '../app/db/board-db';
import { Server } from '../app/server';

describe('ws', () => {
  let socket: Awaited<ReturnType<typeof initWs>>;
  let wsServer: Server;
  const port = 8001;

  const send = (obj: unknown) => {
    return new Promise((resolve) => {
      socket.emit('board', obj);

      setTimeout(() => {
        resolve(null);
      }, 100); // wait for ws & db
    });
  };

  beforeAll(async () => {
    await startDB();
    await createMultipleUsers();
    wsServer = await initTestServer(port);
    socket = await initWs(port);
  });

  function onClose() {
    return new Promise((resolve) => {
      socket.on('close', () => {
        resolve(null);
      });
    });
  }

  it('join & leave free memory', async () => {
    const caller = await getUserCaller(1);

    const board1 = await caller.board.create({
      name: 'board 1',
    });

    await send({ action: 'join', boardId: board1.id });

    const board = await getBoardUser(board1.id, getAuth(1).sub);

    expect(board).toBeTruthy();
    expect(socket.connected).toEqual(true);
    expect(wsServer.clients.length).toEqual(1);
    expect(wsServer.getBoard(board1.id)).toBeTruthy();

    socket.close();

    await onClose();

    expect(wsServer.clients.length).toEqual(0);
    expect(wsServer.getBoard(board1.id)).toBeFalsy();
  });
});
