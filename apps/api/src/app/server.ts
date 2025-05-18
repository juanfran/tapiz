import {
  isUserNode,
  type BoardSettings,
  type StateActions,
  type TNode,
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

  constructor(public io: WsServer) {}

  public async connection(socket: Socket, cookies: Record<string, string>) {
    const sessionId = cookies[lucia.sessionCookieName];
    if (sessionId) {
      const { session, user } = await validateSession(sessionId);

      if (session && user) {
        const dbUser = await db.user.getUser(user.id);

        if (dbUser) {
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

          return;
        }
      }
    }

    socket.disconnect();
  }

  private findBoardSettings(boardId: string): BoardSettings {
    const board = this.getBoard(boardId);
    const defaultBoardSettings: BoardSettings = {};

    if (!board) {
      return defaultBoardSettings;
    }

    const boardSettings = board.find(
      (it): it is TNode<BoardSettings> => it.type === 'settings',
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

  public async createBoard(boardId: string) {
    if (!this.state[boardId]) {
      if (this.stateSubscriptions[boardId]) {
        this.emptyBoard(boardId);
      }

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
          db.board.updateBoard(boardId, state);
        });
    }
  }

  public getBoard(boardId: string): TNode[] | undefined {
    if (!this.state[boardId]) {
      return;
    }

    return this.state[boardId].get();
  }

  public setState(boardId: string, fn: (state: TNode[]) => TNode[]) {
    const nextState = fn(this.state[boardId].get());

    this.updateBoard(boardId, nextState);
  }

  public emptyBoard(boardId: string) {
    db.board.updateBoard(boardId, this.state[boardId].get());

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

  private updateBoard(boardId: string, state: TNode[]) {
    this.state[boardId].update(() => state);
  }
}
