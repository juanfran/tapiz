import { applyDiff, BoardActions, Diff } from '@team-up/board-commons';
import * as WebSocket from 'ws';
import { Server } from './server';
import { messageManager } from './message';
import { joinRoom, getRoomOwners } from './db';
import { checkPermissionsAction } from './permissions';

export class Client {
  public roomId!: string;
  public isOwner!: boolean;
  public sendTimeout?: ReturnType<typeof setTimeout>;
  public pendingMsgs = [];

  constructor(
    public ws: WebSocket,
    private server: Server,
    public username: string,
    public id: string
  ) {
    this.ws.on('message', this.incomingMessage.bind(this));
  }

  public isSessionEvent(eventType: string) {
    return eventType === BoardActions.moveCursor;
  }

  public incomingMessage(messageString: string) {
    const message = this.parseMessage(messageString);

    if (message.action === 'join') {
      this.join(message);
    } else {
      const persist = !this.isSessionEvent(message.type);

      const state = this.server.getRoom(this.roomId);

      const messageHandler = messageManager.find((manager) => {
        return manager.type === message.type;
      });

      if (!checkPermissionsAction(state, message, this.id)) {
        return;
      }

      // validate if the user has permission to make the change
      if (messageHandler) {
        const result = messageHandler.fn(message, this.id, { ...state });
        this.updateStateWithDiff(result);
        this.server.checkConnections(this.roomId);
        this.server.sendAll(
          this.roomId,
          {
            type: BoardActions.wsSetState,
            data: result,
          },
          [this]
        );

        if (persist) {
          this.server.persistRoom(this.roomId);
        }

        if (message.type === BoardActions.setVisible) {
          this.server.setUserVisibility(this.roomId, this.id, message.visible);
        }
      } else if (message.type === BoardActions.setBoardName && this.isOwner) {
        this.server.updateBoardName(this.roomId, message.name);

        this.server.checkConnections(this.roomId);
        this.server.sendAll(this.roomId, message, [this]);
      }
    }
  }

  private async join(message: { roomId: string }) {
    this.roomId = message.roomId;

    joinRoom(this.id, this.roomId);

    await this.server.createRoom(this.roomId);
    const roomUser = await this.server.getRoomUser(this.roomId, this.id);

    const user = {
      name: this.username,
      id: this.id,
      visible: roomUser?.visible ?? false,
      connected: true,
      cursor: null,
    };

    this.server.userJoin(this.roomId, user);

    const room = this.server.getRoom(this.roomId);

    const users = room.users.map((it) => {
      if (it.id === user.id) {
        return user;
      }

      return it;
    });

    const owners = await getRoomOwners(this.roomId);

    this.isOwner = owners.includes(this.id);

    const diff: Diff = {
      set: {
        paths: room.paths,
        notes: room.notes,
        users: users,
        groups: room.groups,
        panels: room.panels,
        images: room.images,
        texts: room.texts,
      },
    };

    this.server.sendAll(
      this.roomId,
      {
        type: BoardActions.wsSetState,
        data: {
          edit: {
            users: [user],
          },
        },
      },
      [this]
    );

    this.send({
      type: BoardActions.wsSetState,
      data: diff,
    });
  }

  public send(msg: any) {
    this.pendingMsgs.push(msg);

    if (this.sendTimeout) {
      return;
    }

    this.sendTimeout = setTimeout(() => {
      this.ws.send(JSON.stringify(this.pendingMsgs));
      this.pendingMsgs = [];
      this.sendTimeout = undefined;
    }, 50);
  }

  private parseMessage(messageString: string) {
    return JSON.parse(messageString);
  }

  private updateStateWithDiff(diff: Diff) {
    this.server.setState(this.roomId, (state) => {
      return applyDiff(diff, state);
    });
  }
}
