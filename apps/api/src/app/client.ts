import {
  BoardCommonActions,
  StateActions,
  TuNode,
  UserNode,
} from '@tapiz/board-commons';
import { Server } from './server.js';
import { type Socket } from 'socket.io';
import db from './db/index.js';
import { validation } from './validation.js';
import { z } from 'zod/v4';
import * as R from 'remeda';

const subSchema = z.object({
  type: z.union([z.literal('board'), z.literal('team')]),
  id: z.string(),
});

export class Client {
  boardId?: string;
  teamId?: string;
  isAdmin!: boolean;
  sendTimeout?: ReturnType<typeof setTimeout>;
  pendingMsgs: unknown[] = [];
  correlationId = '';
  private privateId = '';
  /** Board being joined; it becomes `boardId` once the join is authorised. */
  pendingBoardId?: string;
  // Event rooms joined through `sub`, independent of the active board.
  private boardSubscriptions = new Set<string>();
  private teamSubscriptions = new Set<string>();
  private disconnected = false;
  // Joins, subscriptions, access refreshes and revocations of this socket run
  // one at a time, so none of them can act on a state another one changed
  // while it was waiting for the database.
  private operations: Promise<unknown> = Promise.resolve();

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
    this.socket.on('disconnect', () => {
      this.disconnected = true;
      this.close();
    });
    this.socket.on('leaveBoard', () => {
      void this.serialize(() => this.close());
    });

    // simulate disconnect
    // setTimeout(() => {
    //   this.socket.conn.close();
    // }, 10000);
  }
  private serialize<T>(operation: () => Promise<T> | T): Promise<T> {
    const run = this.operations.then(() =>
      this.disconnected ? (undefined as T) : operation(),
    );
    this.operations = run.catch(() => undefined);
    return run;
  }

  subscriptorMessage(message: { type: 'board' | 'team'; id: string }) {
    return this.serialize(() => this.subscribe(message));
  }

  private async subscribe(message: { type: 'board' | 'team'; id: string }) {
    try {
      const { type, id } = subSchema.parse(message);

      const validUser =
        type === 'board'
          ? await db.board.haveAccess(id, this.id)
          : await db.team.haveAccessTeam(id, this.id);

      if (!validUser) {
        this.unauthorizedClose();
        return;
      }

      this.socket.join(`${type}:${id}`);
      (type === 'board' ? this.boardSubscriptions : this.teamSubscriptions).add(
        id,
      );
    } catch {
      this.socket.disconnect();
    }
  }

  boardIncomingMessage(messages: string | unknown[]) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    messages = (messages as unknown[]).filter((message) => !!message);

    void this.processMsg(messages).catch((e) => {
      console.error(e);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async processMsg(messages: any): Promise<StateActions[]> {
    if (messages.length) {
      if ('action' in messages[0] && messages[0].action === 'join') {
        await this.join(messages[0]);
      } else {
        const [broadcast, stateActions] = R.partition(
          messages,
          (it: Record<string, unknown>) => {
            return it['type'] === BoardCommonActions.broadcast;
          },
        );

        if (!this.boardId) {
          return [];
        }

        if (broadcast.length) {
          this.socket.to(this.boardId).emit('board', broadcast);
        }

        return this.parseStateActionMessage(
          stateActions as unknown as StateActions[],
        );
      }
    }

    return [];
  }

  async parseStateActionMessage(messages: StateActions[]) {
    if (!this.boardId) {
      return [];
    }

    const state = this.server.getBoard(this.boardId);

    if (!state) {
      return [];
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
      return [];
    }

    return this.updateSendAllStateActions(validationResult);
  }

  unauthorizedClose(disconnect = true) {
    this.socket.emit('error', 'unauthorized');

    if (disconnect) {
      this.socket.disconnect();
    }
  }

  /** Re-checks the access to the active (or being joined) board. */
  refreshAccess() {
    return this.serialize(async () => {
      try {
        await this.refreshActiveBoard();
      } catch (error) {
        // Access that cannot be verified is revoked.
        console.error('Board access check failed', error);
        this.dropBoard();
      }
    });
  }

  private async refreshActiveBoard() {
    const boardId = this.boardId;
    if (!boardId) {
      return;
    }

    if (!(await db.board.haveAccess(boardId, this.id))) {
      this.dropBoard();
      return;
    }

    // The board may have changed team (for example after an account removal).
    this.teamId = (await db.board.getBoardBasic(boardId))?.teamId ?? undefined;
    this.isAdmin = await this.isBoardAdmin(boardId);
  }

  /**
   * Re-checks the event rooms joined through `sub` (which can outlive the
   * active board) and leaves the ones the user no longer has access to.
   */
  revalidateSubscriptions() {
    return this.serialize(async () => {
      // A room whose access cannot be verified is left as well.
      const allowed = (check: Promise<boolean>) =>
        check.catch((error: unknown) => {
          console.error('Subscription access check failed', error);
          return false;
        });
      for (const boardId of [...this.boardSubscriptions]) {
        if (!(await allowed(db.board.haveAccess(boardId, this.id)))) {
          this.boardSubscriptions.delete(boardId);
          void this.socket.leave(`board:${boardId}`);
        }
      }
      for (const teamId of [...this.teamSubscriptions]) {
        if (!(await allowed(db.team.haveAccessTeam(teamId, this.id)))) {
          this.teamSubscriptions.delete(teamId);
          void this.socket.leave(`team:${teamId}`);
        }
      }
    });
  }

  /**
   * Drops a board after losing access (or after it was deleted), once any
   * join in progress has finished: leave its rooms and forget it, so no
   * further updates are received and state actions are ignored even if the
   * client ignores the error event. The socket stays connected for other
   * boards and teams. Without `boardId`, drops whatever board is active.
   */
  revokeBoard(boardId?: string) {
    return this.serialize(() => {
      if (!boardId || this.boardId === boardId) {
        this.dropBoard();
      }
    });
  }

  private dropBoard() {
    if (!this.boardId) {
      return;
    }
    this.socket.emit('error', 'unauthorized');
    this.boardSubscriptions.delete(this.boardId);
    void this.socket.leave(`board:${this.boardId}`);
    this.close();
  }

  close() {
    if (!this.boardId) {
      return;
    }

    // The board's state may already have been released: just forget it.
    if (!this.server.getBoard(this.boardId)) {
      this.socket.leave(this.boardId);
      this.boardId = undefined;
      this.teamId = undefined;
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
            content: {
              ...node.content,
              connected: false,
            },
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

    this.sendAll(this.boardId, this.getStateAction([action]));
    // Leave before counting, so the last socket releases the board's state.
    this.socket.leave(this.boardId);
    const roomSize =
      this.server.io.of('/').adapter.rooms.get(this.boardId)?.size || 0;

    if (!roomSize) {
      this.server.emptyBoard(this.boardId);
    }

    this.boardId = undefined;
    this.teamId = undefined;
  }

  private updateSendAllStateActions(actions: StateActions[]) {
    if (!this.boardId) {
      return [];
    }

    const settings = this.server.getBoardSettings(this.boardId);
    if (!this.isAdmin && settings.readOnly) {
      actions = actions.filter((it) => it.data.type === 'user');
    }

    if (!actions.length) {
      return [];
    }

    this.updateStateWithActions(actions);
    this.sendAll(this.boardId, this.getStateAction(actions));

    return actions;
  }

  async joinBoard(boardId: string) {
    await this.join({ boardId });
  }

  private join(message: { boardId: string }) {
    // Marked as soon as it is queued, so changes committed while it waits
    // are queued after it too.
    this.pendingBoardId = message.boardId;
    return this.serialize(async () => {
      this.pendingBoardId = message.boardId;
      try {
        await this.authorizeAndJoin(message);
      } catch (e) {
        console.error(e);
      } finally {
        if (this.pendingBoardId === message.boardId) {
          this.pendingBoardId = undefined;
        }
      }
    });
  }

  /**
   * Runs every check first and only then activates the board in one
   * synchronous step, so state actions are never accepted for a board whose
   * access is still being checked. A revocation committed meanwhile finds
   * this client through `pendingBoardId` and is queued after the join.
   */
  private async authorizeAndJoin(message: { boardId: string }) {
    const boardId = message.boardId;

    if (!z.string().uuid().safeParse(boardId).success) {
      this.unauthorizedClose();
      return;
    }

    if (!(await db.board.haveAccess(boardId, this.id))) {
      this.unauthorizedClose();
      return;
    }

    const teamId = (await db.board.getBoardBasic(boardId))?.teamId ?? undefined;
    await this.server.createBoard(boardId);
    const boardUser = await this.server.getBoardUser(boardId, this.id);
    const isAdmin = await this.isBoardAdmin(boardId);
    const board = this.server.getBoard(boardId);

    if (this.disconnected || !boardUser || !board) {
      return;
    }

    // Activate: nothing below awaits.
    if (this.boardId && this.boardId !== boardId) {
      this.close();
    }

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

    const isAlreadyInBoard = this.server.isUserInBoard(boardId, this.id);
    const userInBoard = board.find((it) => it.id === this.id) as UserNode;
    user.content.visible = userInBoard?.content.visible ?? false;

    this.server.userJoin(boardId, user);
    this.boardId = boardId;
    this.teamId = teamId;
    this.isAdmin = isAdmin;
    this.privateId = boardUser.privateId;

    const userAction: StateActions = {
      data: user,
      op: isAlreadyInBoard ? 'patch' : 'add',
    };

    this.sendAll(boardId, this.getStateAction([userAction]));

    this.socket.join(boardId);

    this.sendToClient(
      this.getSetStateAction(this.server.getBoard(boardId) ?? board),
    );
  }

  async refreshIsAdmin() {
    if (!this.boardId) {
      return;
    }

    const boardId = this.boardId;
    const isAdmin = await this.isBoardAdmin(boardId);

    if (this.boardId === boardId) {
      this.isAdmin = isAdmin;
    }
  }

  private async isBoardAdmin(boardId: string) {
    const admins = await db.board.getBoardAdmins(boardId);
    return admins.includes(this.id);
  }

  getSetStateAction(nodes: TuNode[]) {
    return {
      type: BoardCommonActions.setState,
      data: nodes,
    };
  }

  getStateAction(action: StateActions[]) {
    return {
      type: BoardCommonActions.stateAction,
      data: action,
    };
  }

  sendToClient(msg: unknown) {
    this.socket.emit('board', [msg]);
  }

  sendAll(boardId: string, msg: unknown) {
    this.pendingMsgs.push(msg);

    if (this.sendTimeout) {
      return;
    }

    this.sendTimeout = setTimeout(() => {
      // send to all users in boardId but client
      this.socket.to(boardId).emit('board', this.pendingMsgs);
      this.pendingMsgs = [];
      this.sendTimeout = undefined;
    }, 50);
  }

  private updateStateWithActions(actions: StateActions[]) {
    if (!this.boardId) {
      return;
    }

    this.server.applyAction(this.boardId, actions);
  }
}
