import { applyDiff, BoardActions, Diff } from '@team-up/board-commons';
import * as WebSocket from 'ws';
import { Server } from './server';
import { messageManager } from './message';
import { joinBoard, getBoardOwners } from './db';
import { checkPermissionsAction } from './permissions';

export class Client {
  public boardId!: string;
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

      const state = this.server.getBoard(this.boardId);

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
        this.server.checkConnections(this.boardId);
        this.server.sendAll(
          this.boardId,
          {
            type: BoardActions.wsSetState,
            data: result,
          },
          [this]
        );

        if (persist) {
          this.server.persistBoard(this.boardId);
        }

        if (message.type === BoardActions.setVisible) {
          this.server.setUserVisibility(this.boardId, this.id, message.visible);
        }
      } else if (message.type === BoardActions.setBoardName && this.isOwner) {
        this.server.updateBoardName(this.boardId, message.name);

        this.server.checkConnections(this.boardId);
        this.server.sendAll(this.boardId, message, [this]);
      }
    }
  }

  private async join(message: { boardId: string }) {
    this.boardId = message.boardId;

    joinBoard(this.id, this.boardId);

    await this.server.createBoard(this.boardId);
    const boardUser = await this.server.getBoardUser(this.boardId, this.id);

    const user = {
      name: this.username,
      id: this.id,
      visible: boardUser?.visible ?? false,
      connected: true,
      cursor: null,
    };

    this.server.userJoin(this.boardId, user);

    const board = this.server.getBoard(this.boardId);

    const users = board.users.map((it) => {
      if (it.id === user.id) {
        return user;
      }

      return it;
    });

    const owners = await getBoardOwners(this.boardId);

    this.isOwner = owners.includes(this.id);

    const diff: Diff = {
      set: {
        notes: board.notes,
        users: users,
        groups: board.groups,
        panels: board.panels,
        images: board.images,
        texts: board.texts,
      },
    };

    this.server.sendAll(
      this.boardId,
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
    this.server.setState(this.boardId, (state) => {
      return applyDiff(diff, state);
    });
  }
}
