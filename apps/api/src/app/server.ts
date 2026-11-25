import {
  isUserNode,
  type BoardSettings,
  type StateActions,
  type TuNode,
  type UserNode,
} from '@tapiz/board-commons';
import type { Socket, Server as WsServer } from 'socket.io';
import { Client } from './client.js';
import db from './db/index.js';

import { syncNodeBox } from '@tapiz/sync-node-box';
import { Subscription, throttleTime } from 'rxjs';
import { lucia, validateSession } from './auth.js';

export class Server {
  public clients: Client[] = [];
  private state: Record<string, ReturnType<typeof syncNodeBox>> = {};
  private stateSubscriptions: Record<string, Subscription> = {};
  private boardSettings: Record<string, BoardSettings> = {};
  // Writes of each board's state, in order. A board is only loaded again
  // once they finished, so a viewer joining right after the last one left
  // does not get an older snapshot.
  private saves: Record<string, Promise<void>> = {};
  // Loads in progress, shared by concurrent joins of the same board.
  private loads: Record<string, Promise<void>> = {};

  constructor(public io: WsServer) {}

  public async connection(socket: Socket, cookies: Record<string, string>) {
    // The client may send messages (join, sub...) as soon as it connects,
    // while the session is still being checked: keep them for the Client.
    const early: [string, unknown[]][] = [];
    const keep = (event: string, ...args: unknown[]) => {
      early.push([event, args]);
    };
    socket.onAny(keep);

    let dbUser: Awaited<ReturnType<typeof db.user.getUser>> | undefined;
    try {
      dbUser = await this.authenticate(cookies);
    } finally {
      socket.offAny(keep);
    }

    if (!dbUser) {
      socket.disconnect();
      return;
    }

    // Gone while checking: its disconnect handlers would never run.
    if (socket.disconnected) {
      return;
    }

    const client = new Client(
      socket,
      this,
      dbUser.name,
      dbUser.id,
      dbUser.email,
    );

    this.clients.push(client);

    socket.on('disconnect', () => {
      this.clientClose(client);
    });

    for (const [event, args] of early) {
      socket.listeners(event).forEach((listener) => listener(...args));
    }
  }

  private async authenticate(cookies: Record<string, string>) {
    const sessionId = cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return;
    }

    const { session, user } = await validateSession(sessionId);
    if (!session || !user) {
      return;
    }

    return db.user.getUser(user.id);
  }

  private findBoardSettings(boardId: string): BoardSettings {
    const board = this.getBoard(boardId);
    const defaultBoardSettings: BoardSettings = {};

    if (!board) {
      return defaultBoardSettings;
    }

    const boardSettings = board.find(
      (it): it is TuNode<BoardSettings> => it.type === 'settings',
    );

    return boardSettings?.content ?? defaultBoardSettings;
  }

  public getBoardSettings(boardId: string) {
    if (!this.boardSettings[boardId]) {
      this.boardSettings[boardId] = this.findBoardSettings(boardId);
    }

    return this.boardSettings[boardId];
  }

  public clientClose(client: Client) {
    this.clients = this.clients.filter((it) => it !== client);
  }

  public createBoard(boardId: string): Promise<void> {
    if (this.state[boardId]) {
      return Promise.resolve();
    }

    this.loads[boardId] ??= this.loadBoard(boardId).finally(() => {
      delete this.loads[boardId];
    });

    return this.loads[boardId];
  }

  private async loadBoard(boardId: string) {
    if (this.stateSubscriptions[boardId]) {
      this.emptyBoard(boardId);
    }

    await this.saves[boardId];

    const board = await db.board.getBoard(boardId);

    if (!board) {
      throw new Error('board not found');
    }

    const boardNodes = board.board ?? [];

    this.state[boardId] = syncNodeBox({ history: 0, log: false });

    this.updateBoard(
      boardId,
      boardNodes.map((it) => {
        if (!isUserNode(it)) {
          return it;
        }

        return {
          ...it,
          content: {
            ...it.content,
            connected: false,
            cursor: null,
          },
        } satisfies UserNode;
      }),
    );
    this.stateSubscriptions[boardId] = this.state[boardId]
      .sync()
      .pipe(throttleTime(2000))
      .subscribe((state) => {
        this.saveBoard(boardId, state);
      });
  }

  /** Queues a write of the board's state after the previous ones. */
  private saveBoard(boardId: string, state: TuNode[]) {
    const save = (this.saves[boardId] ?? Promise.resolve())
      .then(() => db.board.updateBoard(boardId, state))
      .then(
        () => undefined,
        (error: unknown) => {
          console.error('Board save failed', error);
        },
      );
    this.saves[boardId] = save;
    void save.then(() => {
      if (this.saves[boardId] === save) {
        delete this.saves[boardId];
      }
    });
  }

  public getBoard(boardId: string): TuNode[] | undefined {
    if (!this.state[boardId]) {
      return;
    }

    return this.state[boardId].get();
  }

  public setState(boardId: string, fn: (state: TuNode[]) => TuNode[]) {
    const nextState = fn(this.state[boardId].get());

    this.updateBoard(boardId, nextState);
  }

  public emptyBoard(boardId: string) {
    const state = this.state[boardId];
    if (state) {
      this.saveBoard(boardId, state.get());
    }

    delete this.state[boardId];

    if (this.stateSubscriptions[boardId]) {
      this.stateSubscriptions[boardId].unsubscribe();
      delete this.stateSubscriptions[boardId];
    }
  }

  public getStateBoardUsers(boardId: string) {
    const state = this.getBoard(boardId);

    return state?.filter((node) => node.type === 'user') ?? [];
  }

  public isUserInBoard(boardId: string, userId: UserNode['id']) {
    const users = this.getStateBoardUsers(boardId);

    return users.some((it) => it.id === userId);
  }

  public userJoin(boardId: string, user: UserNode) {
    const isAlreadyInState = this.isUserInBoard(boardId, user.id);
    const board = this.state[boardId];

    if (isAlreadyInState) {
      board.update((state) => {
        return state.map((it) => {
          if (it.id === user.id) {
            return {
              ...it,
              content: {
                ...it.content,
                username: user.content.name,
                connected: true,
              },
            };
          }

          return it;
        });
      });
    } else {
      board.update((state) => {
        state.push(user);

        return state;
      });
    }
  }

  public getBoardUser(boardId: string, userId: UserNode['id']) {
    return db.board.getBoardUser(boardId, userId);
  }

  public getBoardUsers(boardId: string) {
    return db.board.getBoardUsers(boardId);
  }

  public applyAction(boardId: string, actions: StateActions[]) {
    const newState = this.state[boardId].actions(actions);

    const hasNewSettings = actions.some(
      (it) => it.op === 'patch' && it.data.type === 'settings',
    );

    if (hasNewSettings) {
      const settings = this.findBoardSettings(boardId);

      this.boardSettings[boardId] = settings;
    }

    return newState;
  }

  public updateBoardName(boardId: string, name: string) {
    db.board.updateBoardName(boardId, name);
  }

  private updateBoard(boardId: string, state: TuNode[]) {
    this.state[boardId].update(() => state);
  }
}
