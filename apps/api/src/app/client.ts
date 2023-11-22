import {
  BoardCommonActions,
  NodeAdd,
  StateActions,
  UserNode,
  Validators,
} from '@team-up/board-commons';
import * as WebSocket from 'ws';
import { Server } from './server';
import db from './db';
import { validation } from './validation';
import { z } from 'zod';
// import { saveMsg, init } from './save-session';

// init();

export class Client {
  public boardId?: string;
  public isAdmin!: boolean;
  public sendTimeout?: ReturnType<typeof setTimeout>;
  public pendingMsgs: unknown[] = [];

  constructor(
    public ws: WebSocket,
    private server: Server,
    public username: string,
    public id: string,
    public email: string,
  ) {
    this.ws.on('message', this.incomingMessage.bind(this));
    this.ws.on('close', this.close.bind(this));
  }

  public incomingMessage(messageString: string) {
    let messages = this.parseMessage(messageString);

    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    messages = (messages as unknown[]).filter((message) => !!message);

    this.processMsg(messages);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public processMsg(messages: any) {
    //saveMsg(message);

    if (messages.length) {
      if ('action' in messages[0] && messages[0].action === 'join') {
        this.join(messages[0]);
      } else if (
        BoardCommonActions.setBoardName === messages[0].type &&
        this.isAdmin
      ) {
        this.updateBoardName(messages[0]);
      } else {
        this.parseStateActionMessage(messages);
      }
    }
  }

  private async updateBoardName(message: { name: string }) {
    if (!this.boardId) {
      return;
    }

    const action = Validators.changeBoardName.safeParse(message);

    if (!action.success) {
      return;
    }

    this.server.updateBoardName(this.boardId, action.data.name);
    this.server.sendAll(this.boardId, action.data, [this]);
  }

  public parseStateActionMessage(message: StateActions[]) {
    if (!this.boardId) {
      return;
    }

    const state = this.server.getBoard(this.boardId);

    if (!state) {
      return;
    }

    const validationResult = validation(message, state, this.id);

    if (!validationResult.length) {
      return;
    }

    if (validationResult.length) {
      validationResult.forEach((action) => {
        this.updateSendAllStateAction(action);
      });
    }
  }

  public noAccessClose() {
    this.ws.close(1008, 'Unauthorized');
  }

  public close() {
    if (!this.boardId) {
      return;
    }

    this.server.setState(this.boardId, (state) => {
      state = state.map((node) => {
        if (node.type !== 'user') {
          return node;
        }

        if (node.id === this.id) {
          return {
            ...node,
            connected: false,
          };
        }

        return node;
      });

      return state;
    });

    const action: StateActions = {
      data: {
        type: 'user',
        id: this.id,
        content: {
          connected: false,
          cursor: null,
        },
      },
      op: 'patch',
    };

    this.server.sendAll(this.boardId, this.getSetStateAction([action]), []);
    this.server.clientClose(this);
    const boardId = this.boardId;

    if (!this.server.connectedBoardClients(boardId).length) {
      this.server.emptyBoard(boardId);
    }
  }

  private updateSendAllStateAction(action: StateActions) {
    if (!this.boardId) {
      return;
    }

    this.updateStateWithAction(action);
    this.server.sendAll(this.boardId, this.getSetStateAction([action]), [this]);
  }

  private async join(message: { boardId: string }) {
    const result = z.string().uuid().safeParse(message.boardId);

    if (!result.success) {
      this.noAccessClose();
      return;
    }

    const haveAccess = await db.board.haveAccess(message.boardId, this.id);

    if (!haveAccess) {
      this.noAccessClose();
      return;
    }

    this.boardId = message.boardId;

    await db.board.joinBoard(this.id, this.boardId);

    try {
      await this.server.createBoard(this.boardId);
      const user: UserNode = {
        type: 'user',
        id: this.id,
        content: {
          id: this.id,
          name: this.username,
          visible: false,
          connected: true,
          cursor: null,
        },
      };

      const isAlreadyInBoard = this.server.isUserInBoard(this.boardId, this.id);

      this.server.userJoin(this.boardId, user);

      const board = this.server.getBoard(this.boardId);

      if (!board) {
        return;
      }

      const userInBoard = board.find((it) => it.id === this.id) as UserNode;

      user.content.visible = userInBoard?.content.visible ?? false;

      const admins = await db.board.getAllBoardAdmins(this.boardId);

      this.isAdmin = admins.includes(this.id);

      const initStateActions: StateActions[] = [
        ...board.map((it) => {
          const add: NodeAdd = {
            data: it,
            op: 'add',
          };

          return add;
        }),
      ];

      const userAction: StateActions = {
        data: user,
        op: isAlreadyInBoard ? 'patch' : 'add',
      };

      this.server.sendAll(this.boardId, this.getSetStateAction([userAction]), [
        this,
      ]);

      this.send(this.getSetStateAction(initStateActions));
    } catch (e) {
      console.error(e);
    }
  }

  public getSetStateAction(action: StateActions[]) {
    return {
      type: BoardCommonActions.setState,
      data: action,
    };
  }

  public send(msg: unknown) {
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
    try {
      return JSON.parse(messageString);
    } catch (e) {
      console.error(e);

      return [];
    }
  }

  private updateStateWithAction(action: StateActions) {
    if (!this.boardId) {
      return;
    }

    this.server.applyAction(this.boardId, [action]);
  }
}
