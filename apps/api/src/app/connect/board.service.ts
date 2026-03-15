import type { ConnectRouter, ServiceImpl } from '@connectrpc/connect';
import { ConnectError, Code } from '@connectrpc/connect';
import type { JsonObject } from '@bufbuild/protobuf';
import { BoardService } from '@tapiz/proto/tapiz/v1/board_pb.js';
import { getUserFromContext } from './auth.interceptor.js';
import { classifyNodes } from './viewport-sync.js';
import db from '../db/index.js';
import { checkBoardAccess, revokeBoardAccess } from '../global.js';
import { sendEvent } from '../subscriptor.js';
import { getBoardAdmins, haveAccess } from '../db/board-db.js';

function toProtoNode(node: {
  id: string;
  type: string;
  content: object;
  children?: {
    id: string;
    type: string;
    content: object;
    children?: unknown[];
  }[];
}): {
  id: string;
  type: string;
  content: JsonObject;
  children?: ReturnType<typeof toProtoNode>[];
} {
  return {
    id: node.id,
    type: node.type,
    content: node.content as JsonObject,
    children: node.children?.map((c) => toProtoNode(c as typeof node)),
  };
}

async function requireBoardMember(boardId: string, userId: string) {
  const board = await db.board.getBoard(boardId);
  if (!board) throw new ConnectError('Board not found', Code.NotFound);

  const access = await haveAccess(boardId, userId);
  if (!access) throw new ConnectError('Forbidden', Code.PermissionDenied);

  await db.board.joinBoard(userId, boardId);
  const userBoard = await db.board.getBoardUser(boardId, userId);
  return { board, userBoard };
}

async function requireBoardAdmin(boardId: string, userId: string) {
  const board = await db.board.getBoard(boardId);
  if (!board) throw new ConnectError('Board not found', Code.NotFound);

  const admins = await getBoardAdmins(boardId);
  if (!admins.includes(userId)) {
    throw new ConnectError('Forbidden', Code.PermissionDenied);
  }
  return { board };
}

export function registerBoardService(router: ConnectRouter) {
  const impl: ServiceImpl<typeof BoardService> = {
    async createBoard(req, ctx) {
      const user = getUserFromContext(ctx);
      let team;

      if (req.teamId) {
        team = await db.team.getTeam(req.teamId);
        if (!team) throw new ConnectError('Team not found', Code.NotFound);

        const access = await db.team.getUserTeam(team.id, user.sub);
        if (!access) throw new ConnectError('Forbidden', Code.PermissionDenied);
      }

      const newBoard = await db.board.createBoard(
        req.name,
        user.sub,
        [],
        team?.id ?? null,
      );

      if (team?.id) {
        sendEvent(
          {
            room: `team:${team.id}`,
            event: 'newBoard',
            content: {
              boardId: newBoard.id,
              name: newBoard.name,
              teamId: team.id,
            },
          },
          ctx.requestHeader.get('x-correlation-id') ?? '',
        );
      }

      return { id: newBoard.id, name: req.name };
    },

    async deleteBoard(req, ctx) {
      const user = getUserFromContext(ctx);
      await requireBoardAdmin(req.boardId, user.sub);

      const owners = await getBoardAdmins(req.boardId);
      if (!owners.includes(user.sub)) {
        throw new ConnectError('Forbidden', Code.PermissionDenied);
      }

      await db.board.deleteBoard(req.boardId);
      revokeBoardAccess(req.boardId);

      sendEvent(
        {
          room: `board:${req.boardId}`,
          event: 'deleteBoard',
          content: { boardId: req.boardId },
        },
        ctx.requestHeader.get('x-correlation-id') ?? '',
      );

      return { success: true };
    },

    async getBoard(req, ctx) {
      const user = getUserFromContext(ctx);
      const { userBoard } = await requireBoardMember(req.boardId, user.sub);
      db.board.updateLastAccessedAt(req.boardId, user.sub);

      return {
        board: userBoard
          ? {
              id: userBoard.id,
              name: userBoard.name,
              role: 0,
              starred: userBoard.starred,
              createdAt: userBoard.createdAt?.toString() ?? '',
              lastAccessedAt: userBoard.lastAccessedAt?.toString() ?? '',
              isAdmin: userBoard.isAdmin,
              teamId: userBoard.teamId ?? undefined,
              isPublic: userBoard.public,
            }
          : undefined,
      };
    },

    async listBoards(req, ctx) {
      const user = getUserFromContext(ctx);

      if (req.teamId) {
        const userTeam = await db.team.getUserTeam(req.teamId, user.sub);
        if (!userTeam) throw new ConnectError('Team not found', Code.NotFound);
      }

      if (req.spaceId && !req.teamId) {
        throw new ConnectError(
          'teamId required with spaceId',
          Code.InvalidArgument,
        );
      }

      const boards = await db.board.getBoards(user.sub, {
        spaceId: req.spaceId ?? undefined,
        teamId: req.teamId ?? undefined,
        starred: req.starred ?? undefined,
        offset: req.pagination?.offset ?? 0,
        limit: req.pagination?.limit ?? 10,
        sortBy: '-createdAt',
      });

      return {
        boards: boards.map((b) => ({
          id: b.id,
          name: b.name,
          role: 0,
          starred: b.starred,
          createdAt: String(b.createdAt ?? ''),
          lastAccessedAt: String(b.lastAccessedAt ?? ''),
          isAdmin: b.isAdmin,
          teamId: b.teamId ?? undefined,
          isPublic: b.public,
        })),
        total: boards.length,
      };
    },

    async duplicateBoard(req, ctx) {
      const user = getUserFromContext(ctx);
      const { board } = await requireBoardMember(req.boardId, user.sub);

      const newBoard = await db.board.createBoard(
        board.name + ' (copy)',
        user.sub,
        board.board,
        board.teamId,
      );

      return {
        board: {
          id: newBoard.id,
          name: board.name,
          role: 0,
          starred: false,
          createdAt: newBoard.createdAt?.toString() ?? '',
          lastAccessedAt: '',
          isAdmin: true,
          isPublic: false,
        },
      };
    },

    async renameBoard(req, ctx) {
      const user = getUserFromContext(ctx);
      await requireBoardAdmin(req.boardId, user.sub);
      await db.board.rename(req.boardId, req.name);

      sendEvent(
        {
          room: `board:${req.boardId}`,
          event: 'renameBoard',
          content: { name: req.name },
        },
        ctx.requestHeader.get('x-correlation-id') ?? '',
      );

      return { success: true };
    },

    async changeBoardPrivacy(req, ctx) {
      const user = getUserFromContext(ctx);
      await requireBoardAdmin(req.boardId, user.sub);
      await db.board.setBoardPrivacy(req.boardId, req.isPublic);

      if (!req.isPublic) {
        checkBoardAccess(req.boardId);
      }

      return { success: true };
    },

    async transferBoard(req, ctx) {
      const user = getUserFromContext(ctx);
      await requireBoardAdmin(req.boardId, user.sub);
      await db.board.transferBoard(req.boardId, req.teamId ?? null);

      sendEvent(
        {
          room: `board:${req.boardId}`,
          event: 'transferBoard',
          content: { teamId: req.teamId },
        },
        ctx.requestHeader.get('x-correlation-id') ?? '',
      );

      return { success: true };
    },

    async getBoardUsers(req, ctx) {
      const user = getUserFromContext(ctx);
      await requireBoardMember(req.boardId, user.sub);
      const users = await db.board.getBoardUsers(req.boardId);

      return {
        users: users.map((u) => ({
          id: u.id,
          name: u.name,
          email: '',
          picture: u.picture ?? '',
          role: 0,
        })),
      };
    },

    async changeBoardRole(req, ctx) {
      const user = getUserFromContext(ctx);
      await requireBoardAdmin(req.boardId, user.sub);

      if (req.role !== 1) {
        const boardAdmins = await getBoardAdmins(req.boardId);
        const admins = boardAdmins.filter((m) => m !== req.userId);
        if (!admins.length) {
          throw new ConnectError(
            'Last admin cannot be demoted',
            Code.FailedPrecondition,
          );
        }
      }

      const roleMap: Record<number, 'admin' | 'member' | 'guest'> = {
        1: 'admin',
        2: 'member',
        3: 'guest',
      };
      const mappedRole = roleMap[req.role] ?? 'member';
      await db.board.changeRole(req.boardId, req.userId, mappedRole);

      sendEvent(
        {
          room: `board:${req.boardId}`,
          event: 'changeRoleBoard',
          content: { userId: req.userId, role: mappedRole },
        },
        ctx.requestHeader.get('x-correlation-id') ?? '',
      );

      return { success: true };
    },

    async deleteBoardMember(req, ctx) {
      const user = getUserFromContext(ctx);
      await requireBoardAdmin(req.boardId, user.sub);

      const boardAdmins = await getBoardAdmins(req.boardId);
      const admins = boardAdmins.filter((m) => m !== req.userId);
      if (!admins.length) {
        throw new ConnectError(
          'Cannot remove last admin',
          Code.FailedPrecondition,
        );
      }

      await db.board.deleteMember(req.boardId, req.userId);

      sendEvent(
        {
          room: `board:${req.boardId}`,
          event: 'deleteBoardMember',
          content: { userId: req.userId },
        },
        ctx.requestHeader.get('x-correlation-id') ?? '',
      );

      return { success: true };
    },

    async leaveBoard(req, ctx) {
      const user = getUserFromContext(ctx);
      await requireBoardMember(req.boardId, user.sub);
      await db.board.leaveBoard(user.sub, req.boardId);
      return { success: true };
    },

    async addStar(req, ctx) {
      const user = getUserFromContext(ctx);
      await db.board.addStarredBoard(user.sub, req.boardId);
      return { success: true };
    },

    async removeStar(req, ctx) {
      const user = getUserFromContext(ctx);
      await db.board.removeStarredBoard(user.sub, req.boardId);
      return { success: true };
    },

    async getNode(req, ctx) {
      const user = getUserFromContext(ctx);
      await requireBoardMember(req.boardId, user.sub);
      const board = await db.board.getBoard(req.boardId);
      if (!board) throw new ConnectError('Board not found', Code.NotFound);

      const node = board.board?.find(
        (n: { id: string }) => n.id === req.nodeId,
      );
      if (!node) throw new ConnectError('Node not found', Code.NotFound);

      return { node: toProtoNode(node) };
    },

    async *subscribeBoardEvents(req, ctx) {
      const user = getUserFromContext(ctx);
      await requireBoardMember(req.boardId, user.sub);

      while (!ctx.signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, 30000));
        yield { eventType: 'heartbeat', payload: { case: undefined } } as const;
      }
    },

    async *syncViewportNodes(req, ctx) {
      const user = getUserFromContext(ctx);
      await requireBoardMember(req.boardId, user.sub);

      const board = await db.board.getBoard(req.boardId);
      if (!board?.board) return;

      const viewport = {
        center: {
          x: req.viewport?.center?.x ?? 0,
          y: req.viewport?.center?.y ?? 0,
        },
        width: req.viewport?.width ?? 1920,
        height: req.viewport?.height ?? 1080,
        zoom: req.viewport?.zoom ?? 1,
      };

      const { hot, warm, coldIndex } = classifyNodes(board.board, viewport);

      yield {
        nodes: [...hot, ...warm].map(toProtoNode),
        offscreenIndex: coldIndex.map((m) => ({
          nodeId: m.nodeId,
          bounds: {
            topLeft: { x: m.bounds.topLeft.x, y: m.bounds.topLeft.y },
            bottomRight: {
              x: m.bounds.bottomRight.x,
              y: m.bounds.bottomRight.y,
            },
          },
          layer: m.layer,
        })),
        version: BigInt(Date.now()),
      };
    },
  };

  router.service(BoardService, impl);
}
