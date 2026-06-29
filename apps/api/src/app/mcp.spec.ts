import { randomUUID } from 'node:crypto';
import type { Server as WsServer } from 'socket.io';
import { vi } from 'vitest';
import { startDB } from './db/init-db.js';
import db from './db/index.js';
import {
  applyBoardActionsAsMcpUser,
  createCocomaterialNodeAction,
  TAPIZ_MCP_INSTRUCTIONS,
} from './mcp.js';
import { Server } from './server.js';
import {
  createMultipleUsers,
  getAuth,
  getUserCaller,
  usersTest,
} from '../tests/test-helpers.js';

describe('mcp', () => {
  beforeAll(async () => {
    await startDB();
    await createMultipleUsers();
  });

  afterAll(async () => {
    for (let i = 0; i < usersTest.length; i++) {
      await db.board.deleteUserBoards(getAuth(i).sub);
    }
  });

  it('exposes board-building guidance in server instructions', () => {
    expect(TAPIZ_MCP_INSTRUCTIONS).toContain('apply_board_actions');
    expect(TAPIZ_MCP_INSTRUCTIONS).toContain('notes are editable/votable');
    expect(TAPIZ_MCP_INSTRUCTIONS).toContain('panels are visual lanes');
    expect(TAPIZ_MCP_INSTRUCTIONS).toContain(
      'Do not use content.layer as z-index',
    );
    expect(TAPIZ_MCP_INSTRUCTIONS).toContain(
      'Do not invent arbitrary layers such as layer 2',
    );
    expect(TAPIZ_MCP_INSTRUCTIONS).toContain(
      'validation only accepts layers 0 and 1',
    );
    expect(TAPIZ_MCP_INSTRUCTIONS).toContain('area selection');
    expect(TAPIZ_MCP_INSTRUCTIONS).toContain(
      'Visual depth/z-index comes from node order in the board array',
    );
    expect(TAPIZ_MCP_INSTRUCTIONS).toContain(
      'later sibling nodes render above earlier sibling nodes',
    );
    expect(TAPIZ_MCP_INSTRUCTIONS).toContain('300x300');
    expect(TAPIZ_MCP_INSTRUCTIONS).toContain('leave real empty space');
    expect(TAPIZ_MCP_INSTRUCTIONS).toContain(
      'panel color instead of their own note color',
    );
    expect(TAPIZ_MCP_INSTRUCTIONS).toContain('high-contrast note colors');
    expect(TAPIZ_MCP_INSTRUCTIONS).toContain('avoid raw h1/h2/h3');
    expect(TAPIZ_MCP_INSTRUCTIONS).toContain('verify it in the web app');
  });

  it('applies board actions through a realtime client', async () => {
    const server = new Server({
      to: () => ({
        emit: vi.fn(),
      }),
      of: () => ({
        adapter: {
          rooms: new Map(),
        },
      }),
    } as unknown as WsServer);
    const caller = getUserCaller(1);
    const user = getAuth(1);
    const board = await caller.board.create({
      name: 'mcp board',
    });
    const noteId = randomUUID();

    const result = await applyBoardActionsAsMcpUser(
      server,
      {
        id: user.sub,
        name: user.name,
        email: user.email,
      },
      board.id,
      [
        {
          op: 'add',
          data: {
            id: noteId,
            type: 'note',
            content: {
              text: 'What made this sprint fun?',
              position: {
                x: 120,
                y: 80,
              },
              layer: 1,
              ownerId: user.sub,
              votes: [],
              emojis: [],
              drawing: [],
              width: 240,
              height: 160,
              color: '#fee2e2',
            },
          },
        },
      ],
    );

    expect(result.appliedActions).toHaveLength(1);
    expect(result.board).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: noteId,
          type: 'note',
        }),
      ]),
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const persistedBoard = await db.board.getBoard(board.id);

    expect(persistedBoard?.board).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: noteId,
          type: 'note',
        }),
      ]),
    );
  });

  it('creates a Tapiz vector action from a Cocomaterial asset', () => {
    const action = createCocomaterialNodeAction({
      url: 'https://cocomaterial.com/media/sea_starfish_1.svg',
      width: 150,
      height: 100,
      center: {
        x: 300,
        y: 200,
      },
      layer: 1,
      rotation: 0,
    });

    expect(action).toEqual({
      op: 'add',
      data: {
        id: expect.any(String),
        type: 'vector',
        content: {
          url: 'https://cocomaterial.com/media/sea_starfish_1.svg',
          width: 150,
          height: 100,
          position: {
            x: 225,
            y: 150,
          },
          layer: 1,
          rotation: 0,
        },
      },
    });
  });
});
