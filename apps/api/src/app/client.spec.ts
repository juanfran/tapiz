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

const realBoard = db.board;
const realTeam = db.team;
const haveAccess = vi.fn();
const haveAccessTeam = vi.fn();

beforeEach(() => {
  // `db.board` is an ES module namespace; replace it on the plain `db` object.
  db.board = {
    ...realBoard,
    haveAccess,
    getBoardBasic: vi.fn(async () => undefined),
  } as unknown as typeof realBoard;
  db.team = { ...realTeam, haveAccessTeam } as typeof realTeam;
});

afterEach(() => {
  db.board = realBoard;
  db.team = realTeam;
  vi.clearAllMocks();
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

  it('forgets a board whose state is still loading without throwing', () => {
    const { client, socket, server } = fakeClient();
    server.getBoard.mockReturnValue(undefined as never);

    expect(() => client.revokeBoard()).not.toThrow();

    expect(server.setState).not.toHaveBeenCalled();
    expect(socket.leave).toHaveBeenCalledWith('board-1');
    expect(client.boardId).toBeUndefined();
  });

  it('leaves event rooms it lost access to, even for inactive boards', async () => {
    const { client, socket } = fakeClient();
    const on = (event: string) =>
      socket.on.mock.calls.find(([name]) => name === event)?.[1] as (
        message: unknown,
      ) => Promise<void>;
    haveAccess.mockResolvedValue(true);
    haveAccessTeam.mockResolvedValue(true);
    await on('sub')({ type: 'board', id: 'old-board' });
    await on('sub')({ type: 'team', id: 'team-1' });
    expect(socket.join).toHaveBeenCalledWith('board:old-board');

    haveAccess.mockResolvedValue(false);
    haveAccessTeam.mockResolvedValue(false);
    await client.revalidateSubscriptions();

    expect(socket.leave).toHaveBeenCalledWith('board:old-board');
    expect(socket.leave).toHaveBeenCalledWith('team:team-1');
  });
});
