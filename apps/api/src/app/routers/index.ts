import { router } from '../trpc';
import { TRPCError, initTRPC } from '@trpc/server';
import { AuthContext } from '../auth.context';
import * as db from '../db';
import { z } from 'zod';
import { DBState } from '@team-up/board-commons';

export const t = initTRPC.context<AuthContext>().create();

const isAuthed = t.middleware((opts) => {
  const { ctx } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return opts.next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

export const appRouter = router({
  boards: protectedProcedure.query(async (opts) => {
    const boards = await db.getBoards(opts.ctx.user.sub);

    return boards;
  }),
  newBoard: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(255) }))
    .mutation(async (req) => {
      await db.createUser(req.ctx.user.sub, req.ctx.user['name']);

      const newBoardId = await db.createBoard(
        req.input.name,
        req.ctx.user.sub,
        {
          notes: [],
          groups: [],
          panels: [],
          images: [],
          texts: [],
          vectors: [],
        } as DBState
      );

      return {
        id: newBoardId,
      };
    }),
  deleteBoard: protectedProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .mutation(async (req) => {
      const owners = await db.getBoardOwners(req.input.boardId);

      if (owners.includes(req.ctx.user.sub)) {
        await db.deleteBoard(req.input.boardId);

        return {
          success: true,
        };
      } else {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
    }),
  leaveBoard: protectedProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .mutation(async (req) => {
      const owners = await db.getBoardOwners(req.input.boardId);

      if (!owners.includes(req.ctx.user.sub)) {
        await db.leaveBoard(req.ctx.user.sub, req.input.boardId);

        return {
          success: true,
        };
      } else {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
    }),
  duplicateBoard: protectedProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .mutation(async (req) => {
      const boardUser = await db.getBoardUser(
        req.input.boardId,
        req.ctx.user.sub
      );

      if (!boardUser) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const board = await db.getBoard(req.input.boardId);

      if (!board) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const newBoardId = await db.createBoard(
        board.name,
        req.ctx.user.sub,
        board.board
      );

      return {
        id: newBoardId,
      };
    }),
  removeAccount: protectedProcedure.mutation(async (req) => {
    await db.deleteAccount(req.ctx.user.sub);

    return {
      success: true,
    };
  }),
  board: protectedProcedure
    .input(z.object({ boardId: z.string().uuid() }))
    .query(async (req) => {
      const owners = await db.getBoardOwners(req.input.boardId);
      const board = await db.getBoard(req.input.boardId);

      if (!board) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return {
        ...board,
        owners,
      };
    }),
  user: protectedProcedure.query(async (req) => {
    return {
      name: req.ctx.user['name'],
      sub: req.ctx.user.sub,
    };
  }),
});
