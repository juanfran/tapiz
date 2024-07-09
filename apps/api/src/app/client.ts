import {
  BoardCommonActions,
  NodeAdd,
  StateActions,
  UserNode,
} from '@tapiz/board-commons';
import { Server } from './server.js';
import { type Socket } from 'socket.io';
import db from './db/index.js';
import { validation } from './validation.js';
import { z } from 'zod';
// import { saveMsg, init } from './save-session';

// init();

const subSchema = z.object({
  type: z.union([z.literal('board'), z.literal('team')]),
  ids: z.string().array(),
});

export class Client {
  boardId?: string;
  teamId?: string;
  isAdmin!: boolean;
  sendTimeout?: ReturnType<typeof setTimeout>;
  pendingMsgs: unknown[] = [];
  correlationId = '';
  private privateId = '';

  constructor(
    public socket: Socket,
    private server: Server,
    public username: string,
    public id: string,
    public email: string,
  ) {
    this.socket.on('board', this.boardIncomingMessage.bind(this));
    this.socket.on('sub', this.subscriptorMessage.bind(this));
    this.socket.on('correlationId', (correlationId: string) => {
      this.correlationId = correlationId;
    });
    this.socket.on('disconnect', this.close.bind(this));
    this.socket.on('leaveBoard', () => {
      this.boardId = undefined;
      this.teamId = undefined;
    });
  }

  categorySubscription(prefix: string, ids: string[]) {
    const toUnsubscribe = Array.from(this.socket.rooms).filter((it) => {
      return it.startsWith(prefix) && !ids.includes(`${prefix}${it}`);
    });

    toUnsubscribe.forEach((it) => {
      this.socket.leave(it);
    });

    this.socket.join(ids.map((it) => `${prefix}${it}`));
  }

  subscriptorMessage(message: { type: 'board' | 'team'; ids: string[] }) {
    try {
      const messageResult = subSchema.parse(message);

      const { type, ids } = messageResult;

      if (type === 'board') {
        this.categorySubscription('sub:board:', ids);
      } else if (type === 'team') {
        this.categorySubscription('sub:team:', ids);
      }
    } catch {
      this.socket.disconnect();
    }
  }

  boardIncomingMessage(messages: string | unknown[]) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    messages = (messages as unknown[]).filter((message) => !!message);

    this.processMsg(messages);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  processMsg(messages: any) {
    //saveMsg(message);

    if (messages.length) {
      if ('action' in messages[0] && messages[0].action === 'join') {
        this.join(messages[0]);
      } else {
        this.parseStateActionMessage(messages);
      }
    }
  }

  async parseStateActionMessage(messages: StateActions[]) {
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

  unauthorizedClose(disconnect = true) {
    this.socket.emit('error', 'unauthorized');

    if (disconnect) {
      this.socket.disconnect();
    }
  }

  async refreshAccess() {
    if (!this.boardId) {
      this.unauthorizedClose(false);
      return;
    }

    const haveAccess = await db.board.haveAccess(this.boardId, this.id);

    if (!haveAccess) {
      this.unauthorizedClose(false);
      return;
    }

    this.refreshIsAdmin();
  }

  close() {
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

    this.sendAll(this.boardId, this.getSetStateAction([action]));
    const roomSize =
      this.server.io.of('/').adapter.rooms.get(this.boardId)?.size || 0;

    if (!roomSize) {
      this.server.emptyBoard(this.boardId);
    }
  }

  private updateSendAllStateActions(actions: StateActions[]) {
    if (!this.boardId) {
      return;
    }

    this.updateStateWithActions(actions);
    this.sendAll(this.boardId, this.getSetStateAction(actions));
  }

  private async join(message: { boardId: string }) {
    const result = z.string().uuid().safeParse(message.boardId);

    if (!result.success) {
      this.unauthorizedClose();
      return;
    }

    const haveAccess = await db.board.haveAccess(message.boardId, this.id);

    if (!haveAccess) {
      this.unauthorizedClose();
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

      this.sendAll(this.boardId, this.getSetStateAction([userAction]));

      this.socket.join(this.boardId);

      this.send(this.getSetStateAction(initStateActions));
    } catch (e) {
      console.error(e);
    }
  }

  async refreshIsAdmin() {
    if (!this.boardId) {
      return;
    }

    const admins = await db.board.getAllBoardAdmins(this.boardId);

    this.isAdmin = admins.includes(this.id);
  }

  getSetStateAction(action: StateActions[]) {
    return {
      type: BoardCommonActions.setState,
      data: action,
    };
  }

  send(msg: unknown) {
    this.pendingMsgs.push(msg);

    if (this.sendTimeout) {
      return;
    }

    this.sendTimeout = setTimeout(() => {
      this.socket.emit('board', this.pendingMsgs);
      this.pendingMsgs = [];
      this.sendTimeout = undefined;
    }, 50);
  }

  sendAll(boardId: string, message: unknown) {
    this.socket.to(boardId).emit('board', [message]);
  }

  private updateStateWithActions(actions: StateActions[]) {
    if (!this.boardId) {
      return;
    }

    this.server.applyAction(this.boardId, actions);
  }
}
