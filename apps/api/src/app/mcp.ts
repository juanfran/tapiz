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
import { hashApiToken, isApiToken } from './api-token.js';

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
  layer: number;
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
  layer: z.number().default(1).describe('Board layer'),
  rotation: z.number().default(0).describe('Node rotation in degrees'),
});

const COCOMATERIAL_API_URL = 'https://cocomaterial.com/api';

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

async function authenticateApiToken(
  authorization: string | undefined,
): Promise<McpUser | null> {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];

  if (!token || !isApiToken(token)) {
    return null;
  }

  const user = await db.user.getUserByApiTokenHash(hashApiToken(token));

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
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
      instructions:
        'Use get_board before editing when node IDs or positions are unknown. Use apply_board_actions for multi-node changes so related edits are processed together through Tapiz validation.',
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
        'Read the current Tapiz board nodes for a board the API token can access.',
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
      description:
        'Add one Tapiz board node as the authenticated user. The node content must match the Tapiz schema for its type.',
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
      description:
        'Patch one existing Tapiz board node as the authenticated user. Only include changed content fields.',
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
        'Remove one existing Tapiz board node as the authenticated user.',
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
      description:
        'Apply multiple Tapiz board add, patch, and remove actions as one authenticated realtime edit batch.',
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
        'Read the authenticated Tapiz user settings, including default note styling useful for creating notes.',
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
        'Add a selected Cocomaterial asset to a Tapiz board as a vector or image node.',
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
