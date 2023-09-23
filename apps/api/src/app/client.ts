import {
  applyDiff,
  BoardCommonActions,
  NodeAdd,
  Point,
  StateActions,
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
  public boardId!: string;
  public isAdmin!: boolean;
  public sendTimeout?: ReturnType<typeof setTimeout>;
  public pendingMsgs: unknown[] = [];

  constructor(
    public ws: WebSocket,
    private server: Server,
    public username: string,
    public id: string,
    public email: string
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
  public processMsg(pendingMessages: any) {
    //saveMsg(message);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];
    const mouseMove: { position: Point; cursor: Point; zoom: number }[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pendingMessages.forEach((it: any) => {
      if (it.type !== BoardCommonActions.moveUser) {
        messages.push(it);
      } else {
        mouseMove.push(it);
      }
    });

    this.mouseMoves(mouseMove);

    if (messages.length) {
      if ('action' in messages[0] && messages[0].action === 'join') {
        this.join(messages[0]);
      } else if (
        BoardCommonActions.setBoardName === messages[0].type &&
        this.isAdmin
      ) {
        this.updateBoardName(messages[0]);
      } else if (BoardCommonActions.setVisible === messages[0].type) {
        this.updateUserVisibility(messages[0]);
      } else {
        this.parseStateActionMessage(messages);
      }
    }
  }

  private mouseMoves(
    messages: { position: Point; cursor: Point; zoom: number }[]
  ) {
    const moveMessage = messages.pop();

    if (!moveMessage || !this.boardId) {
      return;
    }

    const result = Validators.userMove.safeParse({
      ...moveMessage,
    });

    if (!result.success) {
      return;
    }

    const action: StateActions = {
      data: {
        type: 'user',
        id: this.id,
        content: {
          ...result.data,
        },
      },
      op: 'patch',
    };

    this.updateStateWithAction(action);
    this.server.sendAll(this.boardId, this.getSetStateAction([action]), [this]);
  }

  private async updateBoardName(message: { name: string }) {
    const action = Validators.changeBoardName.safeParse(message);

    if (!action.success) {
      return;
    }

    this.server.updateBoardName(this.boardId, action.data.name);
    this.server.sendAll(this.boardId, action.data, [this]);
  }

  private updateUserVisibility(message: { visible?: boolean }) {
    const action = Validators.patchUserVisibility.safeParse(message);

    if (!action.success) {
      return;
    }

    this.server.setUserVisibility(this.boardId, this.id, action.data.visible);

    const actionState: StateActions = {
      data: {
        type: 'user',
        id: this.id,
        content: {
          visible: action.data.visible,
        },
      },
      op: 'patch',
    };

    this.updateSendAllStateAction(actionState);
  }

  public parseStateActionMessage(message: StateActions[]) {
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

      this.server.persistBoard(this.boardId);
    }
  }

  public noAccessClose() {
    this.ws.close(1008, 'Unauthorized');
  }

  public close() {
    this.server.setState(this.boardId, (state) => {
      if (!state?.users) {
        return state;
      }

      state.users = state.users.map((user) => {
        if (user.id === this.id) {
          return {
            ...user,
            connected: false,
          };
        }

        return user;
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

    if (!this.server.connectedBoardClients(this.boardId).length) {
      this.server.emptyBoard(this.boardId);
    }
  }

  private updateSendAllStateAction(action: StateActions) {
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
      const boardUser = await this.server.getBoardUser(this.boardId, this.id);

      const user = {
        name: this.username,
        id: this.id,
        visible: boardUser?.visible ?? false,
        connected: true,
        cursor: null,
      };

      const isAlreadyInBoard = this.server.isUserInBoard(this.boardId, this.id);

      this.server.userJoin(this.boardId, user);

      const board = this.server.getBoard(this.boardId);

      if (!board) {
        return;
      }

      const admins = await db.board.getAllBoardAdmins(this.boardId);

      this.isAdmin = admins.includes(this.id);

      const initStateActions: StateActions[] = [
        ...board.users.map((it) => {
          const add: NodeAdd = {
            data: {
              type: 'user',
              id: it.id,
              content: it,
            },
            op: 'add',
          };

          return add;
        }),
        ...board.nodes.map((it) => {
          const add: NodeAdd = {
            data: it,
            op: 'add',
          };

          return add;
        }),
      ];

      const userAction: StateActions = {
        data: {
          type: 'user',
          id: this.id,
          content: user,
        },
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
    this.server.setState(this.boardId, (state) => {
      return applyDiff(action, state);
    });
  }
}
