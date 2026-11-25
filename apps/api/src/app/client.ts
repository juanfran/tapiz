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

interface PendingJoin {
  boardId: string;
  stale: boolean;
  cancelled: boolean;
}

interface PendingSubscription {
  type: 'board' | 'team';
  id: string;
  stale: boolean;
}

const subSchema = z.object({
  type: z.union([z.literal('board'), z.literal('team')]),
  id: z.string(),
});

export class Client {
  boardId?: string;
  teamId?: string;
  isAdmin!: boolean;
  sendTimeout?: ReturnType<typeof setTimeout>;
  // Batched broadcasts, per board room: a board switch must not send one
  // board's updates to the other board's room.
  pendingMsgs = new Map<string, unknown[]>();
  correlationId = '';
  private privateId = '';
  // Joins queued or in progress. A change of access committed meanwhile
  // marks them stale (re-checked before publishing anything), and a leave or
  // disconnect cancels them.
  private pendingJoins = new Set<PendingJoin>();
  // Same for `sub` checks in progress: a revalidation or revocation marks
  // them stale, and they re-check before entering the room.
  private pendingSubscriptions = new Set<PendingSubscription>();
  // Event rooms joined through `sub`, independent of the active board.
  private boardSubscriptions = new Set<string>();
  private teamSubscriptions = new Set<string>();
  // Latest access decision per event room (`board:<id>`, `team:<id>`): a
  // grant or the start of a new check replaces it, so a check only applies
  // its result while it is still the latest one. Values never repeat.
  private eventRoomVersions = new Map<string, number>();
  private lastEventRoomVersion = 0;
  private disconnected = false;
  // Joins, subscriptions, access refreshes and revocations of this socket run
  // one at a time, so none of them can act on a state another one changed
  // while it was waiting for the database.
  private operations: Promise<unknown> = Promise.resolve();
  // Event-room subscriptions only need ordering among themselves; a separate
  // queue keeps a stream of `sub` messages from delaying a revocation.
  private subscriptionOperations: Promise<unknown> = Promise.resolve();

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
      this.cancelPendingJoins();
      this.close();
    });
    this.socket.on('leaveBoard', () => {
      // Leave right away; queued joins are cancelled and publish nothing.
      this.cancelPendingJoins();
      this.close();
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

  private serializeSubscription<T>(
    operation: () => Promise<T> | T,
  ): Promise<T> {
    const run = this.subscriptionOperations.then(() =>
      this.disconnected ? (undefined as T) : operation(),
    );
    this.subscriptionOperations = run.catch(() => undefined);
    return run;
  }

  subscriptorMessage(message: { type: 'board' | 'team'; id: string }) {
    const parsed = subSchema.safeParse(message);
    if (!parsed.success) {
      this.socket.disconnect();
      return Promise.resolve();
    }
    // Registered as soon as it is queued, so a revalidation or revocation
    // meanwhile reaches it.
    const pending: PendingSubscription = { ...parsed.data, stale: false };
    this.pendingSubscriptions.add(pending);
    return this.serializeSubscription(() => this.subscribe(pending)).finally(
      () => this.pendingSubscriptions.delete(pending),
    );
  }

  private async subscribe(pending: PendingSubscription) {
    try {
      const { type, id } = pending;

      const check = () =>
        type === 'board'
          ? db.board.haveAccess(id, this.id)
          : db.team.haveAccessTeam(id, this.id);

      let validUser = await check();
      // Access changed while checking (lost or granted): decide with a fresh
      // read.
      while (pending.stale) {
        pending.stale = false;
        validUser = await check();
      }

      if (this.disconnected) {
        return;
      }

      if (!validUser) {
        this.unauthorizedClose();
        return;
      }

      this.socket.join(`${type}:${id}`);
      (type === 'board' ? this.boardSubscriptions : this.teamSubscriptions).add(
        id,
      );
      // A fresh grant: older checks still in progress no longer decide.
      this.markEventRoom(type, id);
    } catch {
      this.socket.disconnect();
    }
  }

  /** Subscribed (or subscribing) to a board's event room. */
  hasBoardSubscription(boardId: string) {
    return (
      this.boardSubscriptions.has(boardId) ||
      [...this.pendingSubscriptions].some(
        (it) => it.type === 'board' && it.id === boardId,
      )
    );
  }

  /**
   * Re-checks one board's event room after its access changed (privacy,
   * roles, deletion), also when the board is not open: the web client stays
   * subscribed after leaving a board. With `revoke`, leaves it regardless.
   */
  revalidateBoardSubscription(
    boardId: string,
    options: { revoke?: boolean } = {},
  ) {
    this.invalidatePendingSubscriptions('board', boardId);
    if (!this.boardSubscriptions.has(boardId)) {
      return Promise.resolve();
    }
    if (options.revoke) {
      this.leaveEventRoom('board', boardId);
      return Promise.resolve();
    }
    return this.recheckEventRoom('board', boardId);
  }

  /** Leaves a deleted team's event room; pending checks re-check and fail. */
  revokeTeamSubscription(teamId: string) {
    this.invalidatePendingSubscriptions('team', teamId);
    if (this.teamSubscriptions.has(teamId)) {
      this.leaveEventRoom('team', teamId);
    }
  }

  private markEventRoom(type: 'board' | 'team', id: string) {
    const version = ++this.lastEventRoomVersion;
    this.eventRoomVersions.set(`${type}:${id}`, version);
    return version;
  }

  private leaveEventRoom(type: 'board' | 'team', id: string) {
    (type === 'board'
      ? this.boardSubscriptions
      : this.teamSubscriptions
    ).delete(id);
    this.eventRoomVersions.delete(`${type}:${id}`);
    void this.socket.leave(`${type}:${id}`);
  }

  /**
   * Re-checks a joined event room and leaves it without access. The result
   * is dropped when a newer check started or the room was granted again
   * meanwhile: that one decides. A room whose access cannot be verified is
   * left as well.
   */
  private async recheckEventRoom(type: 'board' | 'team', id: string) {
    // Marked before awaiting, so it happens synchronously on call.
    const version = this.markEventRoom(type, id);
    const check =
      type === 'board'
        ? db.board.haveAccess(id, this.id)
        : db.team.haveAccessTeam(id, this.id);
    const allowed = await check.catch((error: unknown) => {
      console.error('Subscription access check failed', error);
      return false;
    });
    if (this.eventRoomVersions.get(`${type}:${id}`) !== version) {
      return;
    }
    if (!allowed) {
      this.leaveEventRoom(type, id);
    }
  }

  private invalidatePendingSubscriptions(type?: 'board' | 'team', id?: string) {
    for (const pending of this.pendingSubscriptions) {
      if (!type || (pending.type === type && pending.id === id)) {
        pending.stale = true;
      }
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

    // The membership may have been removed and the board still be reachable
    // (public): without a current row, the client must join again.
    const boardUser = await this.server.getBoardUser(boardId, this.id);
    if (this.boardId !== boardId) {
      return;
    }
    if (!boardUser) {
      this.dropBoard();
      return;
    }

    // The board may have changed team (for example after an account removal).
    this.teamId = (await db.board.getBoardBasic(boardId))?.teamId ?? undefined;
    this.isAdmin = await this.isBoardAdmin(boardId);
    this.privateId = boardUser.privateId;
  }

  /**
   * Re-checks the event rooms joined through `sub` (which can outlive the
   * active board) and leaves the ones the user no longer has access to.
   */
  revalidateSubscriptions() {
    // Checks still in progress re-check before joining; joined rooms are
    // re-checked right away instead of waiting behind queued `sub` messages.
    this.invalidatePendingSubscriptions();
    return Promise.all([
      ...[...this.boardSubscriptions].map((boardId) =>
        this.recheckEventRoom('board', boardId),
      ),
      ...[...this.teamSubscriptions].map((teamId) =>
        this.recheckEventRoom('team', teamId),
      ),
    ]).then(() => undefined);
  }

  /**
   * Drops a board after losing access (or after it was deleted), once any
   * join in progress has finished: leave its rooms and forget it, so no
   * further updates are received and state actions are ignored even if the
   * client ignores the error event. The socket stays connected for other
   * boards and teams. Without `boardId`, drops whatever board is active.
   */
  revokeBoard(boardId?: string) {
    // The active board is dropped right away, so nothing queued can delay
    // it; the queued pass catches a join of that board still in progress.
    if (!boardId || this.boardId === boardId) {
      this.dropBoard();
    }
    if (boardId) {
      this.invalidatePendingSubscriptions('board', boardId);
    }
    if (!boardId) {
      return Promise.resolve();
    }
    return this.serialize(() => {
      if (this.boardId === boardId) {
        this.dropBoard();
      }
    });
  }

  private dropBoard() {
    const boardId = this.boardId;
    if (!boardId) {
      return;
    }
    this.socket.emit('error', 'unauthorized');
    this.close();
    // The event room has its own access check: losing the membership of a
    // public board, for example, keeps its events.
    if (this.boardSubscriptions.has(boardId)) {
      void this.recheckEventRoom('board', boardId);
    }
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

  /** Whether a join (of `boardId`, or of any board) is queued or running. */
  hasPendingJoin(boardId?: string) {
    return [...this.pendingJoins].some(
      (join) => !boardId || join.boardId === boardId,
    );
  }

  /**
   * Called synchronously when access changed (after the database commit):
   * pending joins re-check access before publishing anything.
   */
  invalidatePendingJoins(boardId?: string) {
    for (const join of this.pendingJoins) {
      if (!boardId || join.boardId === boardId) join.stale = true;
    }
  }

  private cancelPendingJoins() {
    for (const join of this.pendingJoins) join.cancelled = true;
  }

  private join(message: { boardId: string }) {
    // Registered as soon as it is queued, so changes committed while it waits
    // reach it.
    const pending: PendingJoin = {
      boardId: message.boardId,
      stale: false,
      cancelled: false,
    };
    this.pendingJoins.add(pending);
    return this.serialize(async () => {
      try {
        await this.authorizeAndJoin(pending);
      } catch (e) {
        console.error(e);
      } finally {
        this.pendingJoins.delete(pending);
      }
    });
  }

  /**
   * Runs every check first and only then activates the board in one
   * synchronous step, so state actions are never accepted for a board whose
   * access is still being checked. A revocation committed meanwhile finds
   * this client through `pendingBoardId` and is queued after the join.
   */
  private async authorizeAndJoin(pending: PendingJoin) {
    const boardId = pending.boardId;

    if (!z.string().uuid().safeParse(boardId).success) {
      this.unauthorizedClose();
      return;
    }

    if (!(await db.board.haveAccess(boardId, this.id))) {
      // A join the user already abandoned must not disconnect the socket.
      if (!pending.cancelled && !this.disconnected) this.unauthorizedClose();
      return;
    }

    let teamId = (await db.board.getBoardBasic(boardId))?.teamId ?? undefined;
    await this.server.createBoard(boardId);
    let boardUser = await this.server.getBoardUser(boardId, this.id);
    let isAdmin = await this.isBoardAdmin(boardId);

    if (!boardUser) {
      return;
    }

    // Settle everything that may have changed while awaiting, until nothing
    // did; only then activate, without awaiting again.
    for (let attempt = 0; ; attempt++) {
      if (pending.cancelled || this.disconnected) {
        return;
      }
      if (pending.stale) {
        pending.stale = false;
        if (!(await db.board.haveAccess(boardId, this.id))) {
          // Abandoned meanwhile: no error (the web would navigate home).
          if (!pending.cancelled && !this.disconnected) {
            this.socket.emit('error', 'unauthorized');
          }
          return;
        }
        teamId = (await db.board.getBoardBasic(boardId))?.teamId ?? undefined;
        isAdmin = await this.isBoardAdmin(boardId);
        // The membership (and its private id) may have been replaced.
        boardUser = await this.server.getBoardUser(boardId, this.id);
        if (!boardUser) return;
        continue;
      }
      // The last viewer may have released the board's state meanwhile.
      if (!this.server.getBoard(boardId)) {
        if (attempt > 3) return;
        await this.server.createBoard(boardId);
        continue;
      }
      break;
    }

    const board = this.server.getBoard(boardId);
    if (!board) {
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

    // After userJoin, so a returning viewer gets its own node as connected.
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
    const messages = this.pendingMsgs.get(boardId) ?? [];
    messages.push(msg);
    this.pendingMsgs.set(boardId, messages);

    if (this.sendTimeout) {
      return;
    }

    this.sendTimeout = setTimeout(() => {
      // send to all users in each board but this client
      for (const [room, roomMessages] of this.pendingMsgs) {
        this.socket.to(room).emit('board', roomMessages);
      }
      this.pendingMsgs.clear();
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
