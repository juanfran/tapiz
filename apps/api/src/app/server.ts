import { CommonState, User } from '@team-up/board-commons';
import * as WebSocket from 'ws';
import produce from 'immer';
import { Client } from './client';
import * as db from './db';
import { Request } from 'express';
import * as cookie from 'cookie';
import { verifyGoogle } from './auth';
import Config from './config';

export class Server {
  private wss!: WebSocket.Server;

  public clients: Client[] = [];
  public state: Record<string, CommonState> = {};

  public start() {
    this.wss = new WebSocket.Server({ port: Config.WS_SERVER_PORT });
    this.wss.on('connection', this.connection.bind(this));
  }

  public async connection(ws: WebSocket, req: Request) {
    if (req.headers.cookie) {
      const cookies = cookie.parse(req.headers.cookie);

      if (cookies['auth']) {
        const user = await verifyGoogle(cookies['auth']);
        if (user?.name) {
          const client = new Client(
            ws,
            this,
            user.name ?? 'anonymous',
            user.sub
          );
          this.clients.push(client);
          return;
        }
      }
    }

    ws.close();
  }

  public sendAll(boardId: string, message: unknown, exclude: Client[] = []) {
    const boardClients = this.clients.filter((it) => it.boardId === boardId);

    boardClients.forEach((client) => {
      if (
        !exclude.includes(client) &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.send(message);
      }
    });
  }

  public async createBoard(boardId: string) {
    if (!this.state[boardId]) {
      const board = await db.getBoard(boardId);

      if (!board) {
        throw new Error('board not found');
      }

      this.updateBoard(boardId, {
        ...board.board,
        users: [],
      });
    }
  }

  public getBoard(boardId: string): CommonState | undefined {
    return this.state[boardId];
  }

  public setState(boardId: string, fn: (state: CommonState) => void) {
    const nextState = produce(this.state[boardId], (draft) => {
      return fn(draft);
    });

    this.updateBoard(boardId, nextState);
  }

  public userJoin(boardId: string, user: User) {
    const isAlreadyInState = this.state[boardId].users.find(
      (it) => it.id === user.id
    );

    if (isAlreadyInState) {
      this.setState(boardId, (state) => {
        state.users = state.users.map((it) => {
          if (it.id === user.id) {
            return user;
          }

          return it;
        });
      });
    } else {
      this.setState(boardId, (state) => {
        state.users.push(user);
      });
    }
  }

  public getBoardUser(boardId: string, userId: User['id']) {
    return db.getBoardUser(boardId, userId);
  }

  public setUserVisibility(
    boardId: string,
    userId: User['id'],
    visible: boolean
  ) {
    db.updateAccountBoard(boardId, userId, visible);
  }

  public persistBoard(boardId: string) {
    db.updateBoard(boardId, this.state[boardId]);
  }

  public updateBoardName(boardId: string, name: string) {
    db.updateBoardName(boardId, name);
  }

  private updateBoard(boardId: string, state: CommonState) {
    this.state[boardId] = state;
  }
}
