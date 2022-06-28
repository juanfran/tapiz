import { BoardActions, CommonState, User } from '@team-up/board-commons';
import * as WebSocket from 'ws';
import produce from 'immer';
import { Client } from './client';
import * as db from './db';
import { Request } from 'express';
import * as cookie from 'cookie';
import { verifyGoogle } from './auth';

export class Server {
  private wss!: WebSocket.Server;

  public clients: Client[] = [];
  public state: Record<string, CommonState> = {};

  public start() {
    this.wss = new WebSocket.Server({ port: 8080 });
    this.wss.on('connection', this.connection.bind(this));
  }

  public async connection(ws: WebSocket, req: Request) {
    if (req.headers.cookie) {
      const cookies = cookie.parse(req.headers.cookie);

      if (cookies.auth) {
        const user = await verifyGoogle(cookies.auth);
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

  public checkConnections(roomId: string) {
    const openClients = this.clients.filter(
      (client) => client.ws.readyState === client.ws.OPEN
    );
    const closedClients = this.clients.filter(
      (client) =>
        client.ws.readyState === client.ws.CLOSED &&
        !openClients.find((openClient) => {
          return (
            // check if a new connection for the same user/room was made
            openClient.id === client.id && openClient.roomId === client.roomId
          );
        })
    );

    const removedClientIds = closedClients.map((client) => client.id);

    if (removedClientIds.length) {
      this.clients = this.clients.filter(
        (client) => client.ws.readyState === client.ws.OPEN
      );

      this.setState(roomId, (state) => {
        if (!state.users) {
          return;
        }

        state.users = state.users.map((user) => {
          const isClosed = removedClientIds.includes(user.id);

          if (isClosed) {
            return {
              ...user,
              connected: false,
            };
          }

          return user;
        });
      });

      this.sendAll(
        roomId,
        {
          type: BoardActions.wsSetState,
          data: {
            edit: {
              users: closedClients.map((it) => {
                return {
                  id: it.id,
                  connected: false,
                  cursor: null,
                };
              }),
            },
          },
        },
        []
      );
    }
  }

  public sendAll(roomId: string, message: unknown, exclude: Client[] = []) {
    const roomClients = this.clients.filter((it) => it.roomId === roomId);

    roomClients.forEach((client) => {
      if (
        !exclude.includes(client) &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.send(message);
      }
    });
  }

  public async createRoom(roomId: string) {
    if (!this.state[roomId]) {
      const room = await db.getRoom(roomId);

      if (!room) {
        throw new Error('room not found');
      }

      this.updateRoom(roomId, {
        ...room.board,
        users: [],
      });
    }
  }

  public getRoom(roomId: string) {
    return this.state[roomId];
  }

  public setState(roomId: string, fn: (state: CommonState) => void) {
    const nextState = produce(this.state[roomId], (draft) => {
      return fn(draft);
    });

    this.updateRoom(roomId, nextState);
  }

  public userJoin(roomId: string, user: User) {
    const isAlreadyInState = this.state[roomId].users.find(
      (it) => it.id === user.id
    );

    if (isAlreadyInState) {
      this.setState(roomId, (state) => {
        state.users = state.users.map((it) => {
          if (it.id === user.id) {
            return user;
          }

          return it;
        });
      });
    } else {
      this.setState(roomId, (state) => {
        state.users.push(user);
      });
    }
  }

  public getRoomUser(roomId: string, userId: User['id']) {
    return db.getRoomUser(roomId, userId);
  }

  public setUserVisibility(
    roomId: string,
    userId: User['id'],
    visible: boolean
  ) {
    db.updateAccountRoom(roomId, userId, visible);
  }

  public persistRoom(roomId: string) {
    db.updateBoard(roomId, this.state[roomId]);
  }

  public updateBoardName(roomId: string, name: string) {
    db.updateBoardName(roomId, name);
  }

  private updateRoom(roomId: string, state: CommonState) {
    this.state[roomId] = state;
  }
}
