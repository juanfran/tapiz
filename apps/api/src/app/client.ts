import {
  applyDiff,
  BoardCommonActions,
  Point,
  StateActions,
  Validators,
} from '@team-up/board-commons';
import * as WebSocket from 'ws';
import { Server } from './server';
import { joinBoard, getBoardOwners, createUser } from './db';
import { validation } from './validation';
// import { saveMsg, init } from './save-session';

// init();

export class Client {
  public boardId!: string;
  public isOwner!: boolean;
  public sendTimeout?: ReturnType<typeof setTimeout>;
  public pendingMsgs: unknown[] = [];

  constructor(
    public ws: WebSocket,
    private server: Server,
    public username: string,
    public id: string
  ) {
    this.ws.on('message', this.incomingMessage.bind(this));
    this.ws.on('close', this.close.bind(this));
  }

  public incomingMessage(messageString: string) {
    let messages = this.parseMessage(messageString);

    if (!Array.isArray(messages)) {
      return;
    }

    messages = messages.filter((message) => !!message);

    this.processMsg(messages);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public processMsg(pendingMessages: any) {
    //saveMsg(message);

    const messages: any[] = [];
    const mouseMove: { position: Point; cursor: Point; zoom: number }[] = [];

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
        this.isOwner
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

    if (!moveMessage) {
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
        node: {
          id: this.id,
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
        node: {
          id: this.id,
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

  public close() {
    this.server.setState(this.boardId, (state) => {
      if (!state?.users) {
        return;
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
    });

    const action: StateActions = {
      data: {
        type: 'user',
        node: {
          id: this.id,
          connected: false,
          cursor: null,
        },
      },
      op: 'patch',
    };

    this.server.sendAll(this.boardId, this.getSetStateAction([action]), []);
  }

  private updateSendAllStateAction(action: StateActions) {
    this.updateStateWithAction(action);
    this.server.sendAll(this.boardId, this.getSetStateAction([action]), [this]);
  }

  private async join(message: { boardId: string }) {
    this.boardId = message.boardId;

    await createUser(this.id, this.username);
    await joinBoard(this.id, this.boardId);

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

      const owners = await getBoardOwners(this.boardId);

      this.isOwner = owners.includes(this.id);

      const initStateActions: StateActions[] = [
        ...board.users.map(
          (it) =>
            ({
              data: {
                type: 'user',
                node: it,
              },
              op: 'add',
            } as StateActions)
        ),
        ...board.notes.map(
          (it) =>
            ({
              data: {
                type: 'note',
                node: it,
              },
              op: 'add',
            } as StateActions)
        ),
        ...board.groups.map(
          (it) =>
            ({
              data: {
                type: 'group',
                node: it,
              },
              op: 'add',
            } as StateActions)
        ),
        ...board.panels.map(
          (it) =>
            ({
              data: {
                type: 'panel',
                node: it,
              },
              op: 'add',
            } as StateActions)
        ),
        ...board.images.map(
          (it) =>
            ({
              data: {
                type: 'image',
                node: it,
              },
              op: 'add',
            } as StateActions)
        ),
        ...board.texts.map(
          (it) =>
            ({
              data: {
                type: 'text',
                node: it,
              },
              op: 'add',
            } as StateActions)
        ),
        ...board.vectors.map(
          (it) =>
            ({
              data: {
                type: 'vector',
                node: it,
              },
              op: 'add',
            } as StateActions)
        ),
      ];

      const userAction: StateActions = {
        data: {
          type: 'user',
          node: user,
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
