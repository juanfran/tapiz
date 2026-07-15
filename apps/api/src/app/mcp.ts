import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Socket } from 'socket.io';
import { z } from 'zod';
import {
  type CocomaterialApiListVectors,
  type CocomaterialApiVector,
  type CocomaterialTag,
  type StateActions,
  type TuNode,
  withDefaultUserSettings,
} from '@tapiz/board-commons';
import { Client } from './client.js';
import type { Server } from './server.js';
import db from './db/index.js';
import { authenticateApiToken } from './authenticate-api-token.js';

type McpUser = {
  id: string;
  name: string;
  email: string;
};
type CocomaterialNodeInput = {
  url: string;
  width: number;
  height: number;
  center: {
    x: number;
    y: number;
  };
  layer: 0 | 1;
  rotation: number;
  kind?: 'vector' | 'image';
};
type ToolConfig = {
  title: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  annotations: {
    title: string;
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
    openWorldHint: boolean;
  };
};

const boardIdSchema = z.string().uuid();
const nodeSchema = z.object({
  id: z.string().min(1).max(255),
  type: z.string().min(1).max(255),
  content: z.record(z.unknown()),
  children: z.array(z.unknown()).optional(),
});
const actionSchema = z.object({
  op: z.enum(['add', 'remove', 'patch']),
  data: z.object({
    id: z.string().min(1).max(255),
    type: z.string().min(1).max(255),
    content: z.unknown().optional(),
  }),
  parent: z.string().min(1).max(255).optional(),
  position: z.number().int().optional(),
});
const cocomaterialTagsSchema = z.array(z.string().min(1).max(255)).max(20);
const cocomaterialPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
const cocomaterialUrlSchema = z
  .string()
  .url()
  .max(2000)
  .refine((url) => {
    try {
      return new URL(url).hostname === 'cocomaterial.com';
    } catch {
      return false;
    }
  }, 'URL must be from cocomaterial.com');
const cocomaterialNodeSchema = z.object({
  boardId: boardIdSchema.describe('Tapiz board UUID'),
  url: cocomaterialUrlSchema.describe(
    'Cocomaterial asset URL, usually the svg or gif field returned by search_cocomaterial_vectors',
  ),
  kind: z
    .enum(['vector', 'image'])
    .optional()
    .describe(
      'Optional explicit node type. SVG defaults to vector; other URLs default to image.',
    ),
  width: z.number().positive().default(150).describe('Node width'),
  height: z.number().positive().default(150).describe('Node height'),
  center: cocomaterialPositionSchema.describe(
    'Board position for the center of the asset',
  ),
  layer: z
    .union([z.literal(0), z.literal(1)])
    .default(1)
    .describe(
      'Board layer: 0 for participant content, 1 for edit/template content',
    ),
  rotation: z.number().default(0).describe('Node rotation in degrees'),
});

const COCOMATERIAL_API_URL = 'https://cocomaterial.com/api';

export const TAPIZ_MCP_INSTRUCTIONS = [
  'Tapiz is an infinite collaborative board. Read the board before editing existing content.',
  'Use board coordinates in content.position, not browser screen coordinates. Do not use content.layer as z-index: Tapiz uses layer 0 for participant board content such as notes/text and layer 1 for edit/template content such as panels. Do not invent arbitrary layers such as layer 2; validation only accepts layers 0 and 1, and board-mode tools like area selection are designed around those supported layer roles.',
  'Visual depth/z-index comes from node order in the board array: later sibling nodes render above earlier sibling nodes. To put an element in front of or behind another element, move it in the array with apply_board_actions position/order rather than changing content.layer.',
  'Use apply_board_actions for multi-node edits so related changes are validated and persisted as one realtime batch.',
  'Choose node types deliberately: notes are editable/votable sticky content; panels are visual lanes/backgrounds; groups are movable/votable clusters; text is standalone labels/instructions; arrows connect nodes; vectors/images are visual assets; polls, estimation, timers, comments, settings, and users are specialized workflow/runtime nodes.',
  'For post-it workflows such as retrospectives, design lanes around the real default note size of 300x300. Make lanes wide/tall enough for multiple 300x300 notes, leave real empty space in each lane, reserve a header band inside panels, and do not place notes over panel labels or instructions.',
  'Do not set panel content.color for lanes that contain notes unless you intentionally want to recolor every note inside that panel. Tapiz notes inside a panel use the panel color instead of their own note color.',
  'Note text renders black and notes can show an author/footer area, so use light high-contrast note colors and make notes tall enough that content is not hidden by footer UI.',
  'For compact labels in text or panel nodes, avoid raw h1/h2/h3 rich-text tags because Tapiz canvas heading styles render very large. Use paragraph/span markup with explicit font-size and line-height.',
  'After creating a layout, verify it in the web app with Playwright or a browser: check visible text, bounding boxes, layering, and console warnings.',
].join(' ');

const BOARD_NODE_TYPE_GUIDANCE =
  'Node type guidance: note = editable/votable sticky idea card and requires text, votes, emojis, drawing, ownerId, width, height, color, position, and layer on add; use layer 0 for participant notes; user-created notes default to about 300x300, so lane layouts should reserve space for multiple 300x300 notes; use light high-contrast note colors because note text is black, and give notes enough height for content plus footer/author UI. panel = visual background/lane/frame below notes; use layer 1 for template/edit panels; reserve a header band and keep notes below it; avoid panel content.color for lanes containing notes because it overrides note colors inside the panel. group = movable/votable semantic cluster, not a decorative column; text = standalone label/instructions; arrow = connector with local endpoints and optional node-local attachments; vector/image = external visual asset; poll/estimation/timer/comment/settings/user = specialized workflow or runtime nodes to preserve unless explicitly requested.';

const BOARD_RICH_TEXT_GUIDANCE =
  'Rich text caution: raw h1/h2/h3 tags use large canvas template styles. For compact MCP-created text or panel labels, use p/span markup with explicit font-size and line-height, then verify in the browser.';

const BOARD_BATCH_EDIT_GUIDANCE =
  'For multi-node layouts, prefer apply_board_actions over repeated single-node calls. Use board coordinates and explicit width/height. Do not create arbitrary foreground layers such as layer 2; place participant notes/text on layer 0 and edit/template panels on layer 1. Unsupported layers are rejected by validation. For visual stacking, use board array order: later sibling nodes render above earlier sibling nodes, so place panels before notes and move nodes in the array when you need a different depth. For lanes, make panels wide and tall enough for the seed notes plus at least a few empty 300x300 post-it slots, and leave visible gaps between note cards.';

class McpSocket {
  constructor(private server: Server) {}

  on() {
    return this;
  }

  emit() {
    return true;
  }

  to(boardId: string) {
    return this.server.io.to(boardId);
  }

  join() {
    return;
  }

  leave() {
    return;
  }

  disconnect() {
    return this;
  }
}

function textResult(content: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(content, null, 2),
      },
    ],
  };
}

function isAllowedOrigin(origin: string | undefined) {
  if (!origin) {
    return true;
  }

  const allowedOrigins = new Set(
    [process.env['FRONTEND_URL']].filter((it): it is string => !!it),
  );

  try {
    const url = new URL(origin);

    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return true;
    }
  } catch {
    return false;
  }

  return allowedOrigins.has(origin);
}

async function fetchCocomaterial<T>(path: string) {
  const response = await fetch(`${COCOMATERIAL_API_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Cocomaterial request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

function compactCocomaterialVector(vector: CocomaterialApiVector) {
  return {
    id: vector.id,
    name: vector.name,
    tags: vector.tags,
    url: vector.url,
    svg: vector.svg,
    gif: vector.gif,
    coloredSvg: vector.coloredSvg,
    coloredGif: vector.coloredGif,
  };
}

export function createCocomaterialNodeAction(
  input: CocomaterialNodeInput,
): StateActions {
  const type =
    input.kind ??
    (input.url.toLowerCase().endsWith('.svg') ? 'vector' : 'image');

  return {
    op: 'add',
    data: {
      id: randomUUID(),
      type,
      content: {
        url: input.url,
        width: input.width,
        height: input.height,
        position: {
          x: input.center.x - input.width / 2,
          y: input.center.y - input.height / 2,
        },
        rotation: input.rotation,
        layer: input.layer,
      },
    },
  };
}

export async function runAsMcpBoardClient<T>(
  server: Server,
  user: McpUser,
  boardId: string,
  callback: (client: Client) => Promise<T>,
) {
  const socket = new McpSocket(server) as unknown as Socket;
  const client = new Client(socket, server, user.name, user.id, user.email);

  server.clients.push(client);

  try {
    await client.joinBoard(boardId);

    if (client.boardId !== boardId) {
      throw new Error('Unable to join board with this API token');
    }

    return await callback(client);
  } finally {
    client.close();
    server.clientClose(client);
  }
}

export async function applyBoardActionsAsMcpUser(
  server: Server,
  user: McpUser,
  boardId: string,
  actions: StateActions[],
) {
  return runAsMcpBoardClient(server, user, boardId, async (client) => {
    const appliedActions = await client.processMsg(actions);

    return {
      appliedActions,
      board: server.getBoard(boardId) ?? [],
    };
  });
}

function createTapizMcpServer(boardServer: Server, user: McpUser) {
  const server = new McpServer(
    {
      name: 'tapiz',
      version: '0.1.0',
    },
    {
      instructions: TAPIZ_MCP_INSTRUCTIONS,
    },
  );
  const registerTool = <TArgs extends Record<string, unknown>>(
    name: string,
    config: ToolConfig,
    callback: (
      args: TArgs,
    ) => ReturnType<typeof textResult> | Promise<ReturnType<typeof textResult>>,
  ) => {
    const register = server.registerTool.bind(server) as unknown as (
      toolName: string,
      toolConfig: ToolConfig,
      toolCallback: (args: TArgs) => unknown,
    ) => void;

    register(name, config, callback);
  };

  registerTool<{ boardId: string }>(
    'get_board',
    {
      title: 'Get board',
      description:
        'Read the current Tapiz board nodes for a board the API token can access. Call this before editing so you preserve existing content, runtime nodes, positions, layers, and parent/child relationships.',
      inputSchema: z.object({
        boardId: boardIdSchema.describe('Tapiz board UUID'),
      }),
      annotations: {
        title: 'Get board',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ boardId }) => {
      const haveAccess = await db.board.haveAccess(boardId, user.id);

      if (!haveAccess) {
        throw new Error('Unable to read board with this API token');
      }

      const loadedBoard = boardServer.getBoard(boardId);

      if (loadedBoard) {
        return textResult({
          boardId,
          nodes: loadedBoard,
        });
      }

      const persistedBoard = await db.board.getBoard(boardId);

      return textResult({
        boardId,
        nodes: persistedBoard?.board ?? [],
      });
    },
  );

  registerTool<{
    boardId: string;
    node: z.infer<typeof nodeSchema>;
    parent?: string;
    position?: number;
  }>(
    'add_node',
    {
      title: 'Add node',
      description: [
        'Add one Tapiz board node as the authenticated user. The node content must match the Tapiz schema for its type.',
        BOARD_NODE_TYPE_GUIDANCE,
        BOARD_RICH_TEXT_GUIDANCE,
      ].join(' '),
      inputSchema: z.object({
        boardId: boardIdSchema.describe('Tapiz board UUID'),
        node: nodeSchema.describe('Node to add'),
        parent: z
          .string()
          .min(1)
          .max(255)
          .optional()
          .describe('Optional parent node ID'),
        position: z
          .number()
          .int()
          .optional()
          .describe('Optional insertion index within the parent'),
      }),
      annotations: {
        title: 'Add node',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ boardId, node, parent, position }) => {
      const result = await applyBoardActionsAsMcpUser(
        boardServer,
        user,
        boardId,
        [
          {
            op: 'add',
            data: node as TuNode,
            parent,
            position,
          },
        ],
      );

      return textResult(result);
    },
  );

  registerTool<{
    boardId: string;
    id: string;
    type: string;
    content: Record<string, unknown>;
    parent?: string;
    position?: number;
  }>(
    'patch_node',
    {
      title: 'Patch node',
      description: [
        'Patch one existing Tapiz board node as the authenticated user. Only include changed content fields and preserve fields you are not intentionally changing.',
        BOARD_RICH_TEXT_GUIDANCE,
      ].join(' '),
      inputSchema: z.object({
        boardId: boardIdSchema.describe('Tapiz board UUID'),
        id: z.string().min(1).max(255).describe('Node ID to patch'),
        type: z.string().min(1).max(255).describe('Node type'),
        content: z
          .record(z.unknown())
          .describe('Partial node content to merge into the node'),
        parent: z
          .string()
          .min(1)
          .max(255)
          .optional()
          .describe('Optional parent node ID'),
        position: z
          .number()
          .int()
          .optional()
          .describe('Optional insertion index within the parent'),
      }),
      annotations: {
        title: 'Patch node',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ boardId, id, type, content, parent, position }) => {
      const result = await applyBoardActionsAsMcpUser(
        boardServer,
        user,
        boardId,
        [
          {
            op: 'patch',
            data: {
              id,
              type,
              content,
            },
            parent,
            position,
          },
        ],
      );

      return textResult(result);
    },
  );

  registerTool<{
    boardId: string;
    id: string;
    type: string;
    parent?: string;
  }>(
    'remove_node',
    {
      title: 'Remove node',
      description:
        'Remove one existing Tapiz board node as the authenticated user. Preserve user, settings, timer, poll, estimation, and other workflow/runtime nodes unless the user explicitly asked to remove them.',
      inputSchema: z.object({
        boardId: boardIdSchema.describe('Tapiz board UUID'),
        id: z.string().min(1).max(255).describe('Node ID to remove'),
        type: z.string().min(1).max(255).describe('Node type'),
        parent: z
          .string()
          .min(1)
          .max(255)
          .optional()
          .describe('Optional parent node ID'),
      }),
      annotations: {
        title: 'Remove node',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ boardId, id, type, parent }) => {
      const result = await applyBoardActionsAsMcpUser(
        boardServer,
        user,
        boardId,
        [
          {
            op: 'remove',
            data: {
              id,
              type,
            },
            parent,
          },
        ],
      );

      return textResult(result);
    },
  );

  registerTool<{
    boardId: string;
    actions: z.infer<typeof actionSchema>[];
  }>(
    'apply_board_actions',
    {
      title: 'Apply board actions',
      description: [
        'Apply multiple Tapiz board add, patch, and remove actions as one authenticated realtime edit batch.',
        BOARD_BATCH_EDIT_GUIDANCE,
        BOARD_NODE_TYPE_GUIDANCE,
        BOARD_RICH_TEXT_GUIDANCE,
      ].join(' '),
      inputSchema: z.object({
        boardId: boardIdSchema.describe('Tapiz board UUID'),
        actions: z
          .array(actionSchema)
          .min(1)
          .max(100)
          .describe('Tapiz StateActions to process in order'),
      }),
      annotations: {
        title: 'Apply board actions',
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ boardId, actions }) => {
      const result = await applyBoardActionsAsMcpUser(
        boardServer,
        user,
        boardId,
        actions as StateActions[],
      );

      return textResult(result);
    },
  );

  registerTool<Record<string, never>>(
    'get_user_settings',
    {
      title: 'Get user settings',
      description:
        'Read the authenticated Tapiz user settings, including default note styling useful for creating note nodes with the current user as ownerId.',
      inputSchema: z.object({}),
      annotations: {
        title: 'Get user settings',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const dbUser = await db.user.getUser(user.id);

      return textResult({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        settings: withDefaultUserSettings(dbUser?.settings),
      });
    },
  );

  registerTool<Record<string, never>>(
    'list_cocomaterial_tags',
    {
      title: 'List Cocomaterial tags',
      description:
        'List available Cocomaterial tags that can be used to search board illustration assets.',
      inputSchema: z.object({}),
      annotations: {
        title: 'List Cocomaterial tags',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      const tags = await fetchCocomaterial<CocomaterialTag[]>('/tags');

      return textResult({
        tags,
      });
    },
  );

  registerTool<{
    page: number;
    pageSize: number;
    tags: string[];
  }>(
    'search_cocomaterial_vectors',
    {
      title: 'Search Cocomaterial vectors',
      description:
        'Search Cocomaterial assets by tag slugs. Use list_cocomaterial_tags first when tags are unknown.',
      inputSchema: z.object({
        page: z.number().int().min(1).default(1).describe('Results page'),
        pageSize: z
          .number()
          .int()
          .min(1)
          .max(60)
          .default(20)
          .describe('Number of assets to return'),
        tags: cocomaterialTagsSchema
          .default([])
          .describe('Cocomaterial tag slugs to filter by'),
      }),
      annotations: {
        title: 'Search Cocomaterial vectors',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ page, pageSize, tags }) => {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (tags.length) {
        params.set('tags', tags.join(','));
      }

      const result = await fetchCocomaterial<CocomaterialApiListVectors>(
        `/vectors?${params.toString()}`,
      );

      return textResult({
        count: result.count,
        next: result.next,
        previous: result.previous,
        results: result.results.map(compactCocomaterialVector),
      });
    },
  );

  registerTool<z.infer<typeof cocomaterialNodeSchema>>(
    'add_cocomaterial_asset',
    {
      title: 'Add Cocomaterial asset',
      description:
        'Add a selected Cocomaterial asset to a Tapiz board as a vector or image node. Use visual assets sparingly for decoration or context; keep editable meeting content in notes, panels, groups, or text nodes.',
      inputSchema: cocomaterialNodeSchema,
      annotations: {
        title: 'Add Cocomaterial asset',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ boardId, ...nodeInput }) => {
      const result = await applyBoardActionsAsMcpUser(
        boardServer,
        user,
        boardId,
        [createCocomaterialNodeAction(nodeInput)],
      );

      return textResult(result);
    },
  );

  return server;
}

async function handleMcpRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  getBoardServer: () => Server,
) {
  if (!isAllowedOrigin(request.headers.origin)) {
    return reply.code(403).send({ error: 'Origin not allowed' });
  }

  const authorization = Array.isArray(request.headers.authorization)
    ? request.headers.authorization[0]
    : request.headers.authorization;
  const user = await authenticateApiToken(authorization);

  if (!user) {
    return reply
      .code(401)
      .header('WWW-Authenticate', 'Bearer realm="tapiz-mcp"')
      .send({ error: 'Unauthorized' });
  }

  const mcpServer = createTapizMcpServer(getBoardServer(), user);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  reply.raw.on('close', () => {
    void transport.close();
  });

  await mcpServer.connect(transport);
  reply.hijack();
  await transport.handleRequest(request.raw, reply.raw, request.body);
}

export function registerTapizMcp(
  fastify: FastifyInstance,
  getBoardServer: () => Server,
) {
  fastify.get('/api/mcp/health', async () => {
    return { status: 'ok' };
  });

  fastify.route({
    method: ['GET', 'POST', 'DELETE'],
    url: '/api/mcp',
    handler: (request, reply) => {
      return handleMcpRequest(request, reply, getBoardServer);
    },
  });
}
