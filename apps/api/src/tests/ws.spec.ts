import * as WebSocket from 'ws';

import { startWsServer } from '../app/ws-server';
import Config from '../app/config';
import { randFirstName, randUrl, randUuid } from '@ngneat/falso';
import {
  startDB,
  createBoard,
  getBoardUser,
  getBoard,
  updateBoard,
} from '../app/db';
import { BoardCommonActions } from '@team-up/board-commons';
import * as http from 'http';

const userId = randUuid();
const initBoard = {
  notes: [],
  groups: [],
  panels: [],
  images: [],
  texts: [],
  users: [],
  vectors: [],
};

const users: Record<string, string> = {
  'user-1': userId,
  'user-2': randUuid(),
  'user-3': randUuid(),
};

const usersNames: Record<string, string> = {
  'user-1': randFirstName(),
  'user-2': randFirstName(),
  'user-3': randFirstName(),
};

jest.mock('../app/auth', () => {
  return {
    verifyToken: (id: number) => {
      return Promise.resolve({
        sub: users[id],
        name: usersNames[id],
      });
    },
  };
});

describe('ws', () => {
  let ws: WebSocket;

  const send = (obj: unknown) => {
    return new Promise((resolve) => {
      ws.send(JSON.stringify(obj), (err) => {
        setTimeout(() => {
          resolve(err);
        }, 100); // wait for ws & db
      });
    });
  };

  beforeAll(async () => {
    await startDB();

    const server = http.createServer();
    server.listen(8000);

    startWsServer(server);
  });

  beforeAll((done) => {
    ws = new WebSocket(`ws://localhost:8000`, {
      headers: {
        Cookie: 'auth=user-1',
      },
    });
    ws.on('open', done);
    ws.on('error', console.error);
  });

  it('invialid msg', async () => {
    await ws.send('something');

    expect(ws.OPEN).toEqual(WebSocket.OPEN);
  });

  it('join', async () => {
    const board1 = (await createBoard(
      'board 1',
      users['user-2'],
      initBoard
    )) as string;

    await send({ action: 'join', boardId: board1 });

    const board = await getBoardUser(board1, users['user-1']);

    expect(board.visible).toEqual(false);
    expect(ws.OPEN).toEqual(WebSocket.OPEN);
  });

  it('join invalid board', async () => {
    await send({ action: 'join', boardId: 'fake' });

    expect(ws.OPEN).toEqual(WebSocket.OPEN);
  });

  it('event invalid board', async () => {
    await send({ type: 'fakeType', boardId: 'fake' });

    expect(ws.OPEN).toEqual(WebSocket.OPEN);
  });

  describe('work with board', () => {
    let board1: string;

    beforeAll(async () => {
      board1 = (await createBoard(
        'board 1',
        users['user-1'],
        initBoard
      )) as string;

      await send({ action: 'join', boardId: board1 });
    });

    it('set board name', async () => {
      const action = {
        name: 'new board name',
        type: BoardCommonActions.setBoardName,
      };

      await send(action);

      const boardResult = await getBoard(board1);

      expect(boardResult?.name).toEqual('new board name');
      expect(ws.OPEN).toEqual(WebSocket.OPEN);
    });

    it('set visibility', async () => {
      const action = {
        visible: true,
        type: BoardCommonActions.setVisible,
      };

      await send(action);

      const account = await getBoardUser(board1, users['user-1']);

      expect(account.visible).toBe(true);
      expect(ws.OPEN).toEqual(WebSocket.OPEN);
    });

    describe('note', () => {
      it('invalid new', async () => {
        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'note',
                node: {
                  id: 'xx-yy',
                  invalid: 'xx',
                  text: 'xx',
                },
              },
              op: 'add',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        const boardResult = await getBoard(board1);

        expect(boardResult?.board.notes).toHaveLength(0);
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });

      it('new', async () => {
        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'note',
                node: {
                  id: 'xx-yy',
                  text: 'xx',
                  position: { x: 0, y: 0 },
                  emojis: [
                    {
                      unicode: 'x',
                      position: {
                        x: 0,
                        y: 0,
                      },
                    },
                  ],
                  votes: 4,
                  invalidField: true,
                },
              },
              op: 'add',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        const boardResult = await getBoard(board1);

        const note = boardResult?.board.notes[0];

        expect(note?.emojis).toHaveLength(0);
        expect(note?.votes).toEqual(0);
        expect(note?.ownerId).toEqual(userId);
        expect(note?.text).toEqual('xx');
        expect((note as any).invalidField).toBeUndefined();
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });

      it('patch', async () => {
        let boardResult = await getBoard(board1);

        const nodeId = boardResult?.board.notes[0].id;

        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'note',
                node: {
                  id: nodeId,
                  text: 'edit',
                  invalidField: true,
                },
              },
              op: 'patch',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        boardResult = await getBoard(board1);

        const note = boardResult?.board.notes[0];

        expect(note?.text).toEqual('edit');
        expect((note as any).invalidField).toBeUndefined();
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });

      it.skip('patch non-existent note', async () => {});

      it('remove', async () => {
        let boardResult = await getBoard(board1);

        const nodeId = boardResult?.board.notes[0].id;

        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'note',
                node: {
                  id: nodeId,
                  text: 'edit',
                },
              },
              op: 'remove',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        boardResult = await getBoard(board1);

        expect(boardResult?.board.notes).toHaveLength(0);
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });

      it('patch & delete without permissions', async () => {
        await updateBoard(board1, {
          ...initBoard,
          notes: [
            {
              id: 'fake',
              ownerId: 'fake',
              text: 'text',
              emojis: [],
              votes: 0,
              position: { x: 0, y: 0 },
              drawing: [],
            },
          ],
        });

        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'note',
                node: {
                  id: 'fake',
                  text: 'edit',
                },
              },
              op: 'patch',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        const action2 = {
          history: false,
          actions: [
            {
              data: {
                type: 'note',
                node: {
                  id: 'fake',
                  text: 'edit',
                },
              },
              op: 'revome',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);
        await send(action2);

        const boardResult = await getBoard(board1);

        expect(boardResult?.board.notes.length).toEqual(1);
        expect(boardResult?.board.notes[0].text).toEqual('text');
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });
    });

    describe('group', () => {
      it('invalid new', async () => {
        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'group',
                node: {
                  id: 'xx-yy',
                  invalid: 'xx',
                },
              },
              op: 'add',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        const boardResult = await getBoard(board1);

        expect(boardResult?.board.groups).toHaveLength(0);
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });

      it('new', async () => {
        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'group',
                node: {
                  id: 'xx-yy',
                  position: { x: 0, y: 0 },
                  width: 300,
                  height: 300,
                  invalidField: true,
                },
              },
              op: 'add',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        const boardResult = await getBoard(board1);

        const group = boardResult?.board.groups[0];

        expect(group?.width).toEqual(300);
        expect(group?.height).toEqual(300);
        expect(group?.position.x).toEqual(0);
        expect(group?.position.y).toEqual(0);
        expect((group as any).invalidField).toBeUndefined();
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });

      it('patch', async () => {
        let boardResult = await getBoard(board1);

        const nodeId = boardResult?.board.groups[0].id;

        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'group',
                node: {
                  id: nodeId,
                  title: 'edit',
                  invalidField: true,
                },
              },
              op: 'patch',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        boardResult = await getBoard(board1);

        const group = boardResult?.board.groups[0];

        expect(group?.title).toEqual('edit');
        expect((group as any).invalidField).toBeUndefined();
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });
      it('remove', async () => {
        let boardResult = await getBoard(board1);

        const nodeId = boardResult?.board.groups[0].id;

        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'group',
                node: {
                  id: nodeId,
                },
              },
              op: 'remove',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        boardResult = await getBoard(board1);

        expect(boardResult?.board.groups).toHaveLength(0);
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });
    });

    describe('panel', () => {
      it('invalid new', async () => {
        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'panel',
                node: {
                  id: 'xx-yy',
                  title: 'xxx',
                },
              },
              op: 'add',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        const boardResult = await getBoard(board1);

        expect(boardResult?.board.panels).toHaveLength(0);
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });

      it('new', async () => {
        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'panel',
                node: {
                  id: 'xx-yy',
                  position: { x: 0, y: 0 },
                  width: 300,
                  height: 300,
                  color: '#000000',
                  invalidField: true,
                },
              },
              op: 'add',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        const boardResult = await getBoard(board1);

        const panel = boardResult?.board.panels[0];

        expect(panel?.width).toEqual(300);
        expect(panel?.height).toEqual(300);
        expect(panel?.position.x).toEqual(0);
        expect(panel?.position.y).toEqual(0);
        expect((panel as any).invalidField).toBeUndefined();
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });

      it('patch', async () => {
        let boardResult = await getBoard(board1);

        const nodeId = boardResult?.board.panels[0].id;

        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'panel',
                node: {
                  id: nodeId,
                  title: 'edit',
                  invalidField: true,
                },
              },
              op: 'patch',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        boardResult = await getBoard(board1);
        const panel = boardResult?.board.panels[0];

        expect(panel?.title).toEqual('edit');
        expect((panel as any).invalidField).toBeUndefined();
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });
      it('remove', async () => {
        let boardResult = await getBoard(board1);

        const nodeId = boardResult?.board.panels[0].id;

        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'panel',
                node: {
                  id: nodeId,
                },
              },
              op: 'remove',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        boardResult = await getBoard(board1);

        expect(boardResult?.board.panels).toHaveLength(0);
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });
    });

    describe('image', () => {
      it('invalid new', async () => {
        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'image',
                node: {
                  id: 'xx-yy',
                  position: { x: 0, y: 0 },
                  width: 300,
                  height: 300,
                  invalid: 'xx',
                },
              },
              op: 'add',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        const boardResult = await getBoard(board1);

        expect(boardResult?.board.images).toHaveLength(0);
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });

      it('new', async () => {
        const url = randUrl();

        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'image',
                node: {
                  id: 'xx-yy',
                  url,
                  position: { x: 0, y: 0 },
                  width: 300,
                  height: 300,
                  invalidField: true,
                },
              },
              op: 'add',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        const boardResult = await getBoard(board1);

        const image = boardResult?.board.images[0];

        expect(image?.width).toEqual(300);
        expect(image?.url).toEqual(url);
        expect(image?.height).toEqual(300);
        expect(image?.position.x).toEqual(0);
        expect(image?.position.y).toEqual(0);
        expect((image as any).invalidField).toBeUndefined();
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });

      it('patch', async () => {
        let boardResult = await getBoard(board1);

        const nodeId = boardResult?.board.images[0].id;
        const url = randUrl();

        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'image',
                node: {
                  id: nodeId,
                  url,
                },
              },
              op: 'patch',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        boardResult = await getBoard(board1);

        const image = boardResult?.board.images[0];

        expect(image?.url).toEqual(url);
        expect((image as any).invalidField).toBeUndefined();
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });
      it('remove', async () => {
        let boardResult = await getBoard(board1);

        const nodeId = boardResult?.board.images[0].id;

        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'image',
                node: {
                  id: nodeId,
                },
              },
              op: 'remove',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        boardResult = await getBoard(board1);

        expect(boardResult?.board.images).toHaveLength(0);
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });
    });

    describe('text', () => {
      it('invalid new', async () => {
        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'text',
                node: {
                  id: 'xx-yy',
                  position: { x: 0, y: 0 },
                  width: 300,
                  height: 300,
                  invalid: 'xx',
                },
              },
              op: 'add',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        const boardResult = await getBoard(board1);

        expect(boardResult?.board.texts).toHaveLength(0);
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });

      it('new', async () => {
        const url = randUrl();

        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'text',
                node: {
                  id: 'xx-yy',
                  url,
                  text: 'text',
                  position: { x: 0, y: 0 },
                  width: 300,
                  height: 300,
                  color: '#000',
                  size: 16,
                  invalidField: true,
                },
              },
              op: 'add',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        const boardResult = await getBoard(board1);

        const text = boardResult?.board.texts[0];

        expect(text?.width).toEqual(300);
        expect(text?.height).toEqual(300);
        expect(text?.position.x).toEqual(0);
        expect(text?.position.y).toEqual(0);
        expect(text?.size).toEqual(16);
        expect(text?.color).toEqual('#000');
        expect((text as any).invalidField).toBeUndefined();
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });

      it('patch', async () => {
        let boardResult = await getBoard(board1);

        const nodeId = boardResult?.board.texts[0].id;

        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'text',
                node: {
                  id: nodeId,
                  size: 23,
                },
              },
              op: 'patch',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        boardResult = await getBoard(board1);

        const text = boardResult?.board.texts[0];

        expect(text?.size).toEqual(23);
        expect((text as any).invalidField).toBeUndefined();
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });
      it('remove', async () => {
        let boardResult = await getBoard(board1);

        const nodeId = boardResult?.board.texts[0].id;

        const action = {
          history: false,
          actions: [
            {
              data: {
                type: 'text',
                node: {
                  id: nodeId,
                },
              },
              op: 'remove',
            },
          ],
          type: BoardCommonActions.batchNodeActions,
        };

        await send(action);

        boardResult = await getBoard(board1);

        expect(boardResult?.board.texts).toHaveLength(0);
        expect(ws.OPEN).toEqual(WebSocket.OPEN);
      });
    });
  });
});
