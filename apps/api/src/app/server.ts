import { CommonState, User } from '@team-up/board-commons';
import * as WebSocket from 'ws';
import { Client } from './client';
import db from './db';
import { Request } from 'express';
import * as cookie from 'cookie';
import { verifyToken } from './auth';
import { Server as HTTPServer } from 'http';
import { Server as HTTPSServer } from 'https';
export class Server {
  private wss!: WebSocket.Server;
  private pendingBoardUpdates = new Set<string>();

  public clients: Client[] = [];
  private state: Record<string, CommonState> = {};

  public start(server: HTTPServer | HTTPSServer) {
    this.wss = new WebSocket.Server({ server });
    this.wss.on('connection', this.connection.bind(this));

    return this.wss;
  }

  public clientClose(client: Client) {
    this.clients = this.clients.filter((it) => it !== client);
  }

  public async connection(ws: WebSocket, req: Request) {
    if (req.headers.cookie) {
      const cookies = cookie.parse(req.headers.cookie);

      if (cookies['auth']) {
        const user = await verifyToken(cookies['auth']);
        if (user && user['name']) {
          const client = new Client(
            ws,
            this,
            user['name'] ?? 'anonymous',
            user.sub,
            user.email
          );
          this.clients.push(client);
          return;
        }
      }
    }

    ws.close();
  }

  public connectedBoardClients(boardId: string) {
    return this.clients.filter((it) => it.boardId === boardId);
  }

  public sendAll(boardId: string, message: unknown, exclude: Client[] = []) {
    const boardClients = this.connectedBoardClients(boardId);

    boardClients.forEach((client) => {
      if (!exclude.includes(client)) {
        client.send(message);
      }
    });
  }

  public async createBoard(boardId: string) {
    if (!this.state[boardId]) {
      const board = await db.board.getBoard(boardId);

      if (!board) {
        throw new Error('board not found');
      }

      const users = await this.getBoardUsers(boardId);

      this.updateBoard(boardId, {
        ...board.board,
        users: users.map((it) => {
          return {
            ...it,
            connected: false,
            cursor: null,
          };
        }),
      });
    }
  }

  public getBoard(boardId: string): CommonState | undefined {
    return this.state[boardId];
  }

  public setState(boardId: string, fn: (state: CommonState) => CommonState) {
    const nextState = fn(this.state[boardId]);

    this.updateBoard(boardId, nextState);
  }

  public emptyBoard(boardId: string) {
    delete this.state[boardId];
  }

  public isUserInBoard(boardId: string, userId: User['id']) {
    return this.state[boardId].users.some((it) => it.id === userId);
  }

  public userJoin(boardId: string, user: User) {
    const isAlreadyInState = this.isUserInBoard(boardId, user.id);

    if (isAlreadyInState) {
      this.setState(boardId, (state) => {
        state.users = state.users.map((it) => {
          if (it.id === user.id) {
            return user;
          }

          return it;
        });

        return state;
      });
    } else {
      this.setState(boardId, (state) => {
        state.users.push(user);

        return state;
      });
    }
  }

  public getBoardUser(boardId: string, userId: User['id']) {
    return db.board.getBoardUser(boardId, userId);
  }

  public getBoardUsers(boardId: string) {
    return db.board.getBoardUsers(boardId);
  }

  public setUserVisibility(
    boardId: string,
    userId: User['id'],
    visible: boolean
  ) {
    db.board.updateAccountBoard(boardId, userId, visible);
  }

  public persistBoard(boardId: string) {
    if (this.pendingBoardUpdates.has(boardId)) {
      return;
    }

    this.pendingBoardUpdates.add(boardId);

    setTimeout(() => {
      db.board.updateBoard(boardId, this.state[boardId]);
      this.pendingBoardUpdates.delete(boardId);
    }, 500);
  }

  public updateBoardName(boardId: string, name: string) {
    db.board.updateBoardName(boardId, name);
  }

  private updateBoard(boardId: string, state: CommonState) {
    this.state[boardId] = state;
  }
}
