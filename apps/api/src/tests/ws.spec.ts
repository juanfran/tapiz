import { startDB } from '../app/db/init-db';
import {
  createMultipleUsers,
  getAuth,
  getUserCaller,
  initTestServer,
  initWs,
} from './test-helpers';
import { getBoardUser } from '../app/db/board-db';

describe('ws', () => {
  let socket: Awaited<ReturnType<typeof initWs>>;
  const port = 8011;

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
    await initTestServer(port);
    socket = await initWs(port);
  });

  it('invialid msg', async () => {
    await socket.send('something');

    expect(socket.connected).toEqual(true);
  });

  it('join', async () => {
    const caller = await getUserCaller(1);

    const board1 = await caller.board.create({
      name: 'board 1',
    });

    await send({ action: 'join', boardId: board1.id });

    const board = await getBoardUser(board1.id, getAuth(1).sub);

    expect(board).toBeTruthy();
    expect(socket.connected).toEqual(true);
  });
});
