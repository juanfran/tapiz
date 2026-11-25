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
import { sendEvent, sendUserEvent } from '../subscriptor.js';
import { sendMentionNotificationEmail } from '../mailer.js';
import { rateLimitedMiddleware } from '../rate-limited.js';
import { NotTeamMemberError } from '../db/board-db.js';
import { asConflict } from './admin-conflict.js';

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

      // The membership is checked again inside the insert, under a team
      // lock, so a member removed meanwhile cannot end up owning a board.
      const newBoard = await db.board
        .createBoard(req.input.name, req.ctx.user.sub, [], team?.id ?? null, {
          requireTeamMember: true,
        })
        .catch((error: unknown) => {
          if (error instanceof NotTeamMemberError) {
            throw new TRPCError({ code: 'UNAUTHORIZED' });
          }
          throw error;
        });

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
          req.ctx.correlationId,
        );
      }

      return {
        id: newBoard.id,
        name: req.input.name,
      };
    }),
  delete: boardAdminProcedure.mutation(async (req) => {
    const owners = await db.board.getBoardAdmins(req.input.boardId);

    if (owners.includes(req.ctx.user.sub)) {
      await db.board.deleteBoard(req.input.boardId);

      // Notify subscribers before revoking, which removes them from the room.
      sendEvent(
        {
          room: `board:${req.input.boardId}`,
          event: 'deleteBoard',
          content: {
            boardId: req.input.boardId,
          },
        },
        req.ctx.correlationId,
      );

      revokeBoardAccess(req.input.boardId);

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

    await asConflict(() =>
      db.board.leaveBoard(req.ctx.user.sub, req.input.boardId),
    );

    return {
      success: true,
    };
  }),
  duplicate: boardMemberProcedure.mutation(async (req) => {
    // Only team members copy into the team; anyone else who can open the
    // board (for example a public one) gets a personal copy.
    const sourceTeamId = req.ctx.board.teamId;
    const teamId =
      sourceTeamId &&
      (await db.team.getUserTeam(sourceTeamId, req.ctx.user.sub))
        ? sourceTeamId
        : null;

    // The membership is checked again inside the insert, under a team lock.
    const newBoard = await db.board
      .createBoard(
        req.ctx.board.name + ' (copy)',
        req.ctx.user.sub,
        req.ctx.board.board,
        teamId,
        { requireTeamMember: true },
      )
      .catch((error: unknown) => {
        if (error instanceof NotTeamMemberError) {
          throw new TRPCError({ code: 'UNAUTHORIZED' });
        }
        throw error;
      });

    return {
      id: newBoard.id,
      name: req.ctx.board.name,
      teamId: newBoard.teamId,
      role: 'admin',
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

      // Both ways: going private revokes access, and going public must win
      // over denials still being checked.
      checkBoardAccess(req.input.boardId);

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

      sendEvent(
        {
          room: `board:${req.input.boardId}`,
          event: 'renameBoard',
          content: {
            name: req.input.name,
          },
        },
        req.ctx.correlationId,
      );

      return {
        success: true,
      };
    }),
  boards: protectedProcedure
    .input(
      z.object({
        teamId: z.uuid().optional(),
        spaceId: z.uuid().optional(),
        starred: z.boolean().optional(),
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
        sendEvent(
          {
            room: `board:${req.input.boardId}`,
            event: 'transferBoard',
            content: {
              teamId: req.input.teamId,
            },
          },
          req.ctx.correlationId,
        );
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
    .use(rateLimitedMiddleware('mentionBoardUser'))
    .input(
      z.object({
        boardId: z.uuid(),
        nodeId: z.string().optional(),
        userId: z.string(),
      }),
    )
    .mutation(async (req) => {
      if (req.ctx.user.sub === req.input.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot mention yourself.',
        });
      }

      await db.user.mentionUser(
        req.input.boardId,
        req.input.userId,
        req.input.nodeId,
      );

      sendUserEvent({
        userId: req.input.userId,
        event: 'mentionUser',
        content: {
          userId: req.input.userId,
          boardId: req.input.boardId,
          nodeId: req.input.nodeId,
        },
      });

      const mentionedUser = await db.user.getUser(req.input.userId);
      const board = await db.board.getBoardBasic(req.input.boardId);

      if (mentionedUser && board) {
        sendMentionNotificationEmail(
          mentionedUser.email,
          board.id,
          board.name,
          req.ctx.user.name,
          req.input.nodeId,
        );
      }

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
  changeRole: boardAdminProcedure
    .input(
      z.object({
        boardId: z.uuid(),
        userId: z.string().max(256),
        role: z.enum(['admin', 'member', 'guest']),
      }),
    )
    .mutation(async (req) => {
      // The "at least one admin left" check runs inside the locked update.
      await asConflict(() =>
        db.board.changeRole(
          req.input.boardId,
          req.input.userId,
          req.input.role,
        ),
      );

      sendEvent(
        {
          room: `board:${req.input.boardId}`,
          event: 'changeRoleBoard',
          content: {
            userId: req.input.userId,
            role: req.input.role,
          },
        },
        req.ctx.correlationId,
      );
      // A demotion can remove access (for example on a private personal
      // board), including for sockets only subscribed to its events.
      checkBoardAccess(req.input.boardId);

      return {
        success: true,
      };
    }),
  deleteMember: boardAdminProcedure
    .input(
      z.object({
        boardId: z.uuid(),
        userId: z.string().max(256),
      }),
    )
    .mutation(async (req) => {
      // The "at least one admin left" check runs inside the locked delete.
      const removed = await asConflict(() =>
        db.board.deleteMember(req.input.boardId, req.input.userId),
      );

      sendEvent(
        {
          room: `board:${req.input.boardId}`,
          event: 'deleteBoardMember',
          content: {
            userId: req.input.userId,
          },
        },
        req.ctx.correlationId,
      );
      // The removed member may lose access (for example a private personal
      // board), including for sockets only subscribed to its events.
      if (removed) {
        checkBoardAccess(req.input.boardId);
      }

      return {
        success: true,
      };
    }),
});
