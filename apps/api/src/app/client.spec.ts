import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Socket } from 'socket.io';
import { Client } from './client.js';
import type { Server } from './server.js';
import db from './db/index.js';

function fakeClient() {
  // The socket is in the board room until it leaves, like in socket.io.
  const rooms = new Map([['board-1', new Set(['socket-1'])]]);
  const socket = {
    on: vi.fn(),
    emit: vi.fn(),
    leave: vi.fn((room: string) => rooms.get(room)?.delete('socket-1')),
    join: vi.fn(),
    disconnect: vi.fn(),
    to: vi.fn(() => ({ emit: vi.fn() })),
  };
  const server = {
    setState: vi.fn(),
    emptyBoard: vi.fn(),
    createBoard: vi.fn(async () => undefined),
    isUserInBoard: vi.fn(() => false),
    userJoin: vi.fn(),
    getBoardUser: vi.fn(),
    getBoard: vi.fn(() => []),
    io: { of: () => ({ adapter: { rooms } }) },
  };
  const client = new Client(
    socket as unknown as Socket,
    server as unknown as Server,
    'User',
    'user-1',
    'user@example.test',
  );
  client.boardId = 'board-1';
  client.teamId = 'team-1';
  return { client, socket, server };
}

const joinableBoardId = '00000000-0000-4000-8000-000000000001';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function handler(
  socket: ReturnType<typeof fakeClient>['socket'],
  event: string,
) {
  return socket.on.mock.calls.find(([name]) => name === event)?.[1] as (
    message: unknown,
  ) => Promise<void> | void;
}

function join(client: Client, boardId: string) {
  return (
    client as unknown as { join(message: { boardId: string }): Promise<void> }
  ).join({
    boardId,
  });
}

const realBoard = db.board;
const realTeam = db.team;
const haveAccess = vi.fn();
const haveAccessTeam = vi.fn();
const getBoardBasic = vi.fn(async (): Promise<unknown> => undefined);

beforeEach(() => {
  // `db.board` is an ES module namespace; replace it on the plain `db` object.
  db.board = {
    ...realBoard,
    haveAccess,
    getBoardBasic,
    getBoardAdmins: vi.fn(async () => []),
  } as unknown as typeof realBoard;
  db.team = { ...realTeam, haveAccessTeam } as typeof realTeam;
});

afterEach(() => {
  db.board = realBoard;
  db.team = realTeam;
  // Also drops unconsumed `mockResolvedValueOnce` values.
  vi.resetAllMocks();
  vi.useRealTimers();
});

describe('realtime board access', () => {
  it('drops the board when a refresh finds the access gone', async () => {
    vi.useFakeTimers();
    vi.mocked(haveAccess).mockResolvedValue(false);
    const { client, socket, server } = fakeClient();

    await client.refreshAccess();

    expect(socket.emit).toHaveBeenCalledWith('error', 'unauthorized');
    expect(socket.leave).toHaveBeenCalledWith('board-1');
    expect(socket.leave).toHaveBeenCalledWith('board:board-1');
    // The last socket leaving releases the board's in-memory state.
    expect(server.emptyBoard).toHaveBeenCalledWith('board-1');
    expect(client.boardId).toBeUndefined();
    expect(client.teamId).toBeUndefined();
    // Later state actions are ignored even if the client ignores the error.
    expect(
      await client.parseStateActionMessage([
        { op: 'add', data: { type: 'note', id: 'n', content: {} } },
      ] as never),
    ).toEqual([]);
    // Ignored before reaching the board state.
    server.getBoard.mockClear();
    await client.parseStateActionMessage([] as never);
    expect(server.getBoard).not.toHaveBeenCalled();
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('forgets a board whose state was already released without throwing', async () => {
    const { client, socket, server } = fakeClient();
    server.getBoard.mockReturnValue(undefined as never);

    await client.revokeBoard();

    expect(server.setState).not.toHaveBeenCalled();
    expect(socket.leave).toHaveBeenCalledWith('board-1');
    expect(client.boardId).toBeUndefined();
  });

  it('revokes a board whose access cannot be verified', async () => {
    const { client, socket } = fakeClient();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    haveAccess.mockRejectedValue(new Error('database down'));

    await client.refreshAccess();

    expect(socket.emit).toHaveBeenCalledWith('error', 'unauthorized');
    expect(client.boardId).toBeUndefined();
  });

  it('leaves event rooms it lost access to, even for inactive boards', async () => {
    const { client, socket } = fakeClient();
    haveAccess.mockResolvedValue(true);
    haveAccessTeam.mockResolvedValue(true);
    await handler(socket, 'sub')({ type: 'board', id: 'old-board' });
    await handler(socket, 'sub')({ type: 'team', id: 'team-1' });
    expect(socket.join).toHaveBeenCalledWith('board:old-board');

    haveAccess.mockResolvedValue(false);
    haveAccessTeam.mockResolvedValue(false);
    await client.revalidateSubscriptions();

    expect(socket.leave).toHaveBeenCalledWith('board:old-board');
    expect(socket.leave).toHaveBeenCalledWith('team:team-1');
  });

  it('applies a revalidation after a subscription that was still being checked', async () => {
    const { client, socket } = fakeClient();
    const granted = deferred<boolean>();
    haveAccess.mockReturnValueOnce(granted.promise);
    haveAccess.mockResolvedValueOnce(false);

    const subscribing = handler(
      socket,
      'sub',
    )({ type: 'board', id: 'board-2' });
    const revalidating = client.revalidateSubscriptions();
    granted.resolve(true);
    await Promise.all([subscribing, revalidating]);

    // The pending check was marked stale, re-checked, and never joined.
    expect(socket.join).not.toHaveBeenCalledWith('board:board-2');
    expect(socket.emit).toHaveBeenCalledWith('error', 'unauthorized');
  });

  it('ignores board actions until a join is authorised', async () => {
    const { client, server } = fakeClient();
    client.boardId = undefined;
    const granted = deferred<boolean>();
    haveAccess.mockReturnValueOnce(granted.promise);
    haveAccess.mockResolvedValue(true);
    server.getBoardUser.mockResolvedValue({ privateId: 'p', role: 'member' });

    const joining = join(client, joinableBoardId);
    expect(client.hasPendingJoin(joinableBoardId)).toBe(true);
    expect(
      await client.parseStateActionMessage([
        { op: 'add', data: { type: 'note', id: 'n', content: {} } },
      ] as never),
    ).toEqual([]);

    granted.resolve(true);
    await joining;
    expect(client.boardId).toBe(joinableBoardId);
    expect(client.hasPendingJoin()).toBe(false);
  });

  it('leaves the board when asked to while the join was in progress', async () => {
    const { client, socket, server } = fakeClient();
    client.boardId = undefined;
    const granted = deferred<boolean>();
    haveAccess.mockReturnValueOnce(granted.promise);
    server.getBoardUser.mockResolvedValue({ privateId: 'p', role: 'member' });

    const joining = join(client, joinableBoardId);
    handler(socket, 'leaveBoard')(undefined);
    granted.resolve(true);
    await joining;
    await client.revokeBoard('unrelated');

    expect(client.boardId).toBeUndefined();
    // The abandoned join published nothing.
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalledWith('board', expect.anything());
  });

  it('publishes nothing for a join whose access is revoked meanwhile', async () => {
    const { client, socket, server } = fakeClient();
    client.boardId = undefined;
    // Allowed when the join starts, revoked when it re-checks.
    haveAccess.mockResolvedValueOnce(true).mockResolvedValue(false);
    const member = deferred<unknown>();
    server.getBoardUser.mockReturnValue(member.promise);

    const joining = join(client, joinableBoardId);
    await vi.waitFor(() => expect(server.getBoardUser).toHaveBeenCalled());
    // What revokeBoardAccess / checkBoardAccess do after the commit.
    client.invalidatePendingJoins(joinableBoardId);
    const revoking = client.revokeBoard(joinableBoardId);
    member.resolve({ privateId: 'p', role: 'member' });
    await Promise.all([joining, revoking]);

    expect(client.boardId).toBeUndefined();
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalledWith('board', expect.anything());
    expect(socket.emit).toHaveBeenCalledWith('error', 'unauthorized');
  });

  it('keeps every queued join reachable by invalidations', async () => {
    const { client, socket, server } = fakeClient();
    client.boardId = undefined;
    const otherBoardId = '00000000-0000-4000-8000-000000000003';
    const firstCheck = deferred<boolean>();
    haveAccess.mockReturnValueOnce(firstCheck.promise);
    server.getBoardUser.mockResolvedValue({ privateId: 'p', role: 'member' });

    const first = join(client, joinableBoardId);
    const second = join(client, otherBoardId);
    expect(client.hasPendingJoin(joinableBoardId)).toBe(true);
    expect(client.hasPendingJoin(otherBoardId)).toBe(true);

    client.invalidatePendingJoins(joinableBoardId);
    haveAccess.mockImplementation(async (boardId: string) => {
      return boardId !== joinableBoardId;
    });
    firstCheck.resolve(true);
    await Promise.all([first, second]);

    expect(socket.join).not.toHaveBeenCalledWith(joinableBoardId);
    expect(client.boardId).toBe(otherBoardId);
  });

  it('reloads a board whose state was released during the join', async () => {
    const { client, server } = fakeClient();
    client.boardId = undefined;
    haveAccess.mockResolvedValue(true);
    server.getBoardUser.mockResolvedValue({ privateId: 'p', role: 'member' });
    // Released by the last viewer, then loaded again.
    server.getBoard.mockReturnValueOnce(undefined as never);

    await join(client, joinableBoardId);

    expect(server.createBoard).toHaveBeenCalledTimes(2);
    expect(client.boardId).toBe(joinableBoardId);
  });

  it('batches broadcasts per board room', () => {
    vi.useFakeTimers();
    const { client, socket } = fakeClient();
    const rooms = new Map<string, ReturnType<typeof vi.fn>>();
    socket.to.mockImplementation(((room: string) => {
      const emit = vi.fn();
      rooms.set(room, emit);
      return { emit };
    }) as never);

    client.sendAll('board-a', 'left a');
    client.sendAll('board-b', 'joined b');
    vi.advanceTimersByTime(60);

    expect(rooms.get('board-a')).toHaveBeenCalledWith('board', ['left a']);
    expect(rooms.get('board-b')).toHaveBeenCalledWith('board', ['joined b']);
  });

  it('does not activate a board after the socket disconnected', async () => {
    const { client, socket, server } = fakeClient();
    client.boardId = undefined;
    const granted = deferred<boolean>();
    haveAccess.mockReturnValueOnce(granted.promise);
    server.getBoardUser.mockResolvedValue({ privateId: 'p', role: 'member' });

    const joining = join(client, joinableBoardId);
    handler(socket, 'disconnect')(undefined);
    granted.resolve(true);
    await joining;

    expect(client.boardId).toBeUndefined();
    expect(socket.join).not.toHaveBeenCalled();
    expect(server.userJoin).not.toHaveBeenCalled();
  });

  it('revokes the active board even while subscriptions are being checked', async () => {
    const { client, socket } = fakeClient();
    const stuck = deferred<boolean>();
    haveAccess.mockReturnValue(stuck.promise);
    for (let i = 0; i < 100; i++) {
      void handler(socket, 'sub')({ type: 'board', id: `other-${i}` });
    }

    void client.revokeBoard('board-1');

    expect(client.boardId).toBeUndefined();
    expect(socket.emit).toHaveBeenCalledWith('error', 'unauthorized');
    stuck.resolve(true);
  });

  it('sends a returning viewer its own node as connected', async () => {
    const { client, socket, server } = fakeClient();
    client.boardId = undefined;
    haveAccess.mockResolvedValue(true);
    server.getBoardUser.mockResolvedValue({ privateId: 'p', role: 'member' });
    const offline = [
      { id: 'user-1', type: 'user', content: { connected: false } },
    ];
    const online = [
      { id: 'user-1', type: 'user', content: { connected: true } },
    ];
    let joined = false;
    server.userJoin.mockImplementation(() => {
      joined = true;
    });
    server.getBoard.mockImplementation((() =>
      joined ? online : offline) as never);

    await join(client, joinableBoardId);

    expect(socket.emit).toHaveBeenCalledWith('board', [
      expect.objectContaining({ data: online }),
    ]);
  });

  it('neither errors nor disconnects for an abandoned join that is denied', async () => {
    const { client, socket } = fakeClient();
    client.boardId = undefined;
    const check = deferred<boolean>();
    haveAccess.mockReturnValueOnce(check.promise);

    const joining = join(client, joinableBoardId);
    handler(socket, 'leaveBoard')(undefined);
    check.resolve(false);
    await joining;

    expect(socket.emit).not.toHaveBeenCalledWith('error', 'unauthorized');
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('drops the board when its membership is gone on refresh', async () => {
    const { client, socket, server } = fakeClient();
    haveAccess.mockResolvedValue(true);
    server.getBoardUser.mockResolvedValue(undefined);

    await client.refreshAccess();

    expect(client.boardId).toBeUndefined();
    expect(socket.emit).toHaveBeenCalledWith('error', 'unauthorized');
  });

  it('leaves the event room of a board it no longer has open once access is lost', async () => {
    const { client, socket } = fakeClient();
    client.boardId = undefined;
    haveAccess.mockResolvedValue(true);
    await handler(socket, 'sub')({ type: 'board', id: 'board-7' });
    expect(client.hasBoardSubscription('board-7')).toBe(true);

    haveAccess.mockResolvedValue(false);
    await client.revalidateBoardSubscription('board-7');

    expect(socket.leave).toHaveBeenCalledWith('board:board-7');
    expect(client.hasBoardSubscription('board-7')).toBe(false);
  });

  it('does not re-enter a board event room revoked while its sub was checking', async () => {
    const { client, socket } = fakeClient();
    const check = deferred<boolean>();
    haveAccess.mockReturnValueOnce(check.promise);
    haveAccess.mockResolvedValue(false);

    const subscribing = handler(
      socket,
      'sub',
    )({ type: 'board', id: 'board-1' });
    void client.revokeBoard('board-1');
    check.resolve(true);
    await subscribing;

    expect(socket.join).not.toHaveBeenCalledWith('board:board-1');
  });
});
