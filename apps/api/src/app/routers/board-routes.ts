import { TRPCError } from '@trpc/server';
import { z } from 'zod/v4';
import { BoardUser } from '@tapiz/board-commons';
import {
  boardAdminProcedure,
  boardMemberProcedure,
  protectedProcedure,
  router,
  teamMemberProcedure,
} from '../trpc.js';
import db from '../db/index.js';
import { checkBoardAccess, revokeBoardAccess } from '../global.js';
import { triggerBoard, triggerTeam, triggerUser } from '../subscriptor.js';

export const boardRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        teamId: z.string().uuid().optional(),
      }),
    )
    .mutation(async (req) => {
      let team;

      if (req.input.teamId) {
        team = await db.team.getTeam(req.input.teamId);

        if (!team) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
      }

      if (team) {
        let haveAccess = false;
        const access = await db.team.getUserTeam(team.id, req.ctx.user.sub);

        if (access) {
          haveAccess = true;
        }

        if (!haveAccess) {
          throw new TRPCError({ code: 'UNAUTHORIZED' });
        }
      }

      const newBoard = await db.board.createBoard(
        req.input.name,
        req.ctx.user.sub,
        [],
        team?.id ?? null,
      );

      if (team?.id) {
        triggerTeam(team?.id, req.ctx.correlationId);
      }

      return {
        id: newBoard.id,
        name: req.input.name,
      };
    }),
  delete: boardAdminProcedure.mutation(async (req) => {
    const owners = await db.board.getAllBoardAdmins(req.input.boardId);

    if (owners.includes(req.ctx.user.sub)) {
      await db.board.deleteBoard(req.input.boardId);

      revokeBoardAccess(req.input.boardId);
      triggerBoard(req.input.boardId, req.ctx.correlationId);

      return {
        success: true,
      };
    } else {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
  }),
  leave: boardMemberProcedure.mutation(async (req) => {
    if (!req.ctx.userBoard) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    await db.board.leaveBoard(req.ctx.user.sub, req.input.boardId);

    return {
      success: true,
    };
  }),
  duplicate: boardMemberProcedure.mutation(async (req) => {
    const newBoard = await db.board.createBoard(
      req.ctx.board.name + ' (copy)',
      req.ctx.user.sub,
      req.ctx.board.board,
      req.ctx.board.teamId,
    );

    return {
      id: newBoard.id,
      name: req.ctx.board.name,
      role: req.ctx.userBoard?.role ?? 'guest',
      isAdmin: true,
      createdAt: newBoard.createdAt,
    } as BoardUser;
  }),
  changePrivacy: boardAdminProcedure
    .input(
      z.object({
        boardId: z.string().uuid(),
        isPublic: z.boolean(),
      }),
    )
    .mutation(async (req) => {
      await db.board.setBoardPrivacy(req.input.boardId, req.input.isPublic);

      if (!req.input.isPublic) {
        checkBoardAccess(req.input.boardId);
      }

      return {
        success: true,
      };
    }),
  board: boardMemberProcedure.query(async (req) => {
    db.board.updateLastAccessedAt(req.input.boardId, req.ctx.user.sub);

    return req.ctx.userBoard;
  }),
  boardUsers: boardMemberProcedure.query(async (req) => {
    return db.board.getBoardUsers(req.input.boardId);
  }),
  rename: boardAdminProcedure
    .input(
      z.object({
        boardId: z.string().uuid(),
        name: z.string().max(255),
      }),
    )
    .mutation(async (req) => {
      await db.board.rename(req.input.boardId, req.input.name);

      triggerBoard(req.input.boardId, req.ctx.correlationId);

      return {
        success: true,
      };
    }),
  boards: protectedProcedure
    .input(
      z.object({
        teamId: z.string().uuid().optional(),
        spaceId: z.string().uuid().optional(),
        starred: z.boolean().optional().default(false),
        offset: z.number().int().optional().default(0),
        limit: z.number().int().optional().default(10),
        sortBy: z
          .enum([
            '-createdAt',
            'createdAt',
            '-lastAccess',
            'lastAccess',
            '-name',
            'name',
          ])
          .optional()
          .default('-createdAt'),
      }),
    )
    .query(async (req) => {
      if (req.input.teamId) {
        const userTeam = await db.team.getUserTeam(
          req.input.teamId,
          req.ctx.user.sub,
        );

        if (!userTeam) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
      }

      if (req.input.spaceId && !req.input.teamId) {
        throw new TRPCError({ code: 'BAD_REQUEST' });
      }

      return await db.board.getBoards(req.ctx.user.sub, {
        spaceId: req.input.spaceId,
        teamId: req.input.teamId,
        starred: req.input.starred,
        offset: req.input.offset,
        limit: req.input.limit,
        sortBy: req.input.sortBy,
      });
    }),
  addStar: protectedProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .mutation(async (req) => {
      await db.board.addStarredBoard(req.ctx.user.sub, req.input.boardId);

      return {
        success: true,
      };
    }),
  removeStar: protectedProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .mutation(async (req) => {
      await db.board.removeStarredBoard(req.ctx.user.sub, req.input.boardId);

      return {
        success: true,
      };
    }),
  transferBoard: boardAdminProcedure
    .input(
      z.object({
        boardId: z.string().uuid(),
        teamId: z.string().uuid().optional(),
      }),
    )
    .mutation(async (req) => {
      await db.board.transferBoard(req.input.boardId, req.input.teamId ?? null);

      if (!req.input.teamId) {
        triggerBoard(req.input.boardId, req.ctx.correlationId);
      }

      return {
        success: true,
      };
    }),
  boardMentions: boardMemberProcedure
    .input(
      z.object({
        boardId: z.string().uuid(),
      }),
    )
    .query(async (req) => {
      return db.board.getUsersToMention(req.input.boardId);
    }),
  mentionBoardUser: boardMemberProcedure
    .input(
      z.object({
        boardId: z.string().uuid(),
        nodeId: z.string().optional(),
        userId: z.string(),
      }),
    )
    .mutation(async (req) => {
      await db.user.mentionUser(
        req.input.boardId,
        req.input.userId,
        req.input.nodeId,
      );

      triggerUser(req.input.userId);

      return {
        success: true,
      };
    }),
  allTeamBoards: teamMemberProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
      }),
    )
    .query(async (req) => {
      return db.board.getAllTeamBoards(req.input.teamId);
    }),
});
