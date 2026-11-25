import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import type { Socket, Server as WsServer } from 'socket.io';
import type { TuNode } from '@tapiz/board-commons';
import { Server } from './server.js';
import db from './db/index.js';

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const note = (id: string) =>
  ({ id, type: 'note', content: { text: id } }) as unknown as TuNode;

const realBoard = db.board;
const realUser = db.user;
let stored: TuNode[];
const getBoard = vi.fn(async () => ({ id: 'board-1', board: stored }));
const updateBoard = vi.fn(async (_id: string, board: TuNode[]) => {
  stored = board;
});

beforeEach(() => {
  stored = [note('saved')];
  db.board = {
    ...realBoard,
    getBoard,
    updateBoard,
  } as unknown as typeof realBoard;
});

afterEach(() => {
  db.board = realBoard;
  db.user = realUser;
  vi.resetAllMocks();
});

function newServer() {
  return new Server({} as WsServer);
}

describe('board state', () => {
  it('reloads a released board only after its final save', async () => {
    const server = newServer();
    await server.createBoard('board-1');
    server.applyAction('board-1', [{ op: 'add', data: note('latest') }]);

    const saving = deferred();
    updateBoard.mockImplementationOnce(async (_id, board) => {
      await saving.promise;
      stored = board;
    });
    // The last viewer leaves, and someone joins right away.
    server.emptyBoard('board-1');
    const reloading = server.createBoard('board-1');
    saving.resolve();
    await reloading;

    expect(server.getBoard('board-1')?.map((it) => it.id)).toEqual([
      'saved',
      'latest',
    ]);
  });

  it('still reloads a board whose final save failed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const server = newServer();
    await server.createBoard('board-1');
    updateBoard.mockRejectedValueOnce(new Error('database down'));

    server.emptyBoard('board-1');
    await server.createBoard('board-1');

    expect(server.getBoard('board-1')).toBeTruthy();
  });

  it('loads a board once for concurrent joins', async () => {
    const server = newServer();

    await Promise.all([
      server.createBoard('board-1'),
      server.createBoard('board-1'),
    ]);

    expect(getBoard).toHaveBeenCalledTimes(1);
  });
});

/** Incoming events reach `onAny` listeners first, like in socket.io. */
function fakeSocket() {
  const emitter = new EventEmitter();
  const anyListeners = new Set<(event: string, ...args: unknown[]) => void>();
  const socket = {
    id: 'socket-1',
    disconnected: false,
    on: (event: string, listener: (...args: unknown[]) => void) => {
      emitter.on(event, listener);
      return socket;
    },
    listeners: (event: string) => emitter.listeners(event),
    onAny: (listener: (event: string, ...args: unknown[]) => void) => {
      anyListeners.add(listener);
      return socket;
    },
    offAny: (listener: (event: string, ...args: unknown[]) => void) => {
      anyListeners.delete(listener);
      return socket;
    },
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
  const deliver = (event: string, ...args: unknown[]) => {
    anyListeners.forEach((listener) => listener(event, ...args));
    emitter.emit(event, ...args);
  };
  return { socket, deliver };
}

describe('connections', () => {
  beforeEach(() => {
    db.user = {
      ...realUser,
      getUser: vi.fn(async (id: string) => ({
        id,
        name: 'User',
        email: 'user@example.test',
      })),
    } as unknown as typeof realUser;
  });

  it('handles messages sent while the session was being checked', async () => {
    const server = newServer();
    const { socket, deliver } = fakeSocket();

    const connecting = server.connection(socket as unknown as Socket, {
      auth: '1',
    });
    deliver('correlationId', 'early');
    await connecting;

    expect(server.clients).toHaveLength(1);
    expect(server.clients[0].correlationId).toBe('early');
  });

  it('forgets a socket that disconnected while its session was checked', async () => {
    const server = newServer();
    const { socket, deliver } = fakeSocket();

    const connecting = server.connection(socket as unknown as Socket, {
      auth: '1',
    });
    socket.disconnected = true;
    deliver('disconnect', 'client namespace disconnect');
    await connecting;

    expect(server.clients).toHaveLength(0);
  });
});
