import {
  BoardCommonActions,
  NodeAdd,
  StateActions,
  UserNode,
} from '@team-up/board-commons';
import { Server } from './server.js';
import type { WebSocket } from 'ws';
import db from './db/index.js';
import { validation } from './validation.js';
import { z } from 'zod';
// import { saveMsg, init } from './save-session';

// init();

export class Client {
  public boardId?: string;
  public teamId?: string;
  public isAdmin!: boolean;
  public sendTimeout?: ReturnType<typeof setTimeout>;
  public pendingMsgs: unknown[] = [];
  private privateId = '';

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
      } else {
        this.parseStateActionMessage(messages);
      }
    }
  }

  public async parseStateActionMessage(messages: StateActions[]) {
    if (!this.boardId) {
      return;
    }

    const state = this.server.getBoard(this.boardId);

    if (!state) {
      return;
    }

    const validationResult = await validation(
      messages,
      state,
      this.id,
      this.isAdmin,
      this.boardId,
      this.privateId,
    );

    if (!validationResult.length) {
      return;
    }

    if (validationResult.length) {
      this.updateSendAllStateActions(validationResult);
    }
  }

  public noAccessClose() {
    this.ws.close(1008, 'Unauthorized');
  }

  public async refreshAccess() {
    if (!this.boardId) {
      this.noAccessClose();
      return;
    }

    const haveAccess = await db.board.haveAccess(this.boardId, this.id);

    if (!haveAccess) {
      this.noAccessClose();
      return;
    }

    this.refreshIsAdmin();
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

  private updateSendAllStateActions(actions: StateActions[]) {
    if (!this.boardId) {
      return;
    }

    this.updateStateWithActions(actions);
    this.server.sendAll(this.boardId, this.getSetStateAction(actions), [this]);
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

    this.teamId =
      (await db.board.getBoardBasic(message.boardId))?.teamId ?? undefined;

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
      const boardUser = await this.server.getBoardUser(this.boardId, this.id);

      if (!boardUser || !board) {
        return;
      }

      const userInBoard = board.find((it) => it.id === this.id) as UserNode;

      user.content.visible = userInBoard?.content.visible ?? false;

      this.refreshIsAdmin();
      this.privateId = boardUser.privateId;

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

  public async refreshIsAdmin() {
    if (!this.boardId) {
      return;
    }

    const admins = await db.board.getAllBoardAdmins(this.boardId);

    this.isAdmin = admins.includes(this.id);
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

  private updateStateWithActions(actions: StateActions[]) {
    if (!this.boardId) {
      return;
    }

    this.server.applyAction(this.boardId, actions);
  }
}
