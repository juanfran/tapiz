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
const haveAccess = vi.fn();

beforeEach(() => {
  // `db.board` is an ES module namespace; replace it on the plain `db` object.
  db.board = { ...realBoard, haveAccess } as typeof realBoard;
});

afterEach(() => {
  db.board = realBoard;
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
    expect(server.getBoard).not.toHaveBeenCalled();
    expect(socket.disconnect).not.toHaveBeenCalled();
  });
});
