import {
  boardAdminProcedure,
  boardMemberProcedure,
  protectedProcedure,
  router,
  teamMemberProcedure,
} from '../trpc';
import { TRPCError } from '@trpc/server';
import db from '../db';
import { z } from 'zod';
import { Board } from '@team-up/board-commons';
import { checkBoardAccess, revokeBoardAccess } from '../global';

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

      return {
        id: newBoard.id,
        name: req.input.name,
      };
    }),
  delete: boardAdminProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .mutation(async (req) => {
      const owners = await db.board.getAllBoardAdmins(req.input.boardId);

      if (owners.includes(req.ctx.user.sub)) {
        await db.board.deleteBoard(req.input.boardId);

        revokeBoardAccess(req.input.boardId);

        return {
          success: true,
        };
      } else {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
    }),
  leave: boardMemberProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .mutation(async (req) => {
      if (!req.ctx.userBoard) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      await db.board.leaveBoard(req.ctx.user.sub, req.input.boardId);

      return {
        success: true,
      };
    }),
  duplicate: boardMemberProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .mutation(async (req) => {
      const newBoard = await db.board.createBoard(
        req.ctx.board.name,
        req.ctx.user.sub,
        req.ctx.board.board,
        req.ctx.board.teamId,
      );

      return {
        id: newBoard.id,
        name: req.ctx.board.name,
        role: 'admin',
        createdAt: newBoard.createdAt,
      } as Board;
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
  board: boardMemberProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .query(async (req) => {
      const admins = await db.board.getBoardAdmins(req.input.boardId);

      const isAdmin = admins.includes(req.ctx.user.sub);

      db.board.updateLastAccessedAt(req.input.boardId, req.ctx.user.sub);

      return {
        ...req.ctx.board,
        isAdmin,
      };
    }),
  teamBoards: teamMemberProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .query(async (req) => {
      return db.board.getUsersBoardsByTeam(req.ctx.user.sub, req.input.teamId);
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

      return {
        success: true,
      };
    }),

  boards: protectedProcedure.query(async (req) => {
    return await db.board.getBoards(req.ctx.user.sub);
  }),
  starreds: protectedProcedure.query(async (req) => {
    return await db.board.getStarredBoards(req.ctx.user.sub);
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

      return {
        success: true,
      };
    }),
});
