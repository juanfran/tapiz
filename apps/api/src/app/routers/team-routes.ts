import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  protectedProcedure,
  router,
  teamAdminProcedure,
  teamMemberProcedure,
} from '../trpc.js';
import db from '../db/index.js';
import { checkTeamBoardsAccess, revokeBoardAccess } from '../global.js';
import { triggerTeam, triggerUser } from '../subscriptor.js';
import {
  addBoardsToSpace,
  createSpace,
  getSpaceBoards,
} from '../db/team-db.js';
import { Space } from '@tapiz/board-commons';

export const teamRouter = router({
  new: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(255) }))
    .mutation(async (req) => {
      return await db.team.createTeam(req.input.name, req.ctx.user.sub);
    }),
  getAll: protectedProcedure.query(async (req) => {
    return await db.team.getUserTeams(req.ctx.user.sub);
  }),
  invitations: teamAdminProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
      }),
    )
    .query(async (req) => {
      const invitations = await db.team.getTeamInvitations(req.input.teamId);

      return invitations;
    }),
  members: teamAdminProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
      }),
    )
    .query(async (req) => {
      const members = await db.team.getTeamMembers(req.input.teamId);

      return members;
    }),
  invite: teamAdminProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        email: z.string().email().max(256),
        role: z.enum(['admin', 'member']),
      }),
    )
    .mutation(async (req) => {
      const invitedUser = await db.user.getUserByEmail(req.input.email);

      let invitations = await db.user.getUserInvitationsByEmail(
        req.input.email,
      );

      if (invitedUser) {
        const userInvitations = await db.user.getUserInvitations(
          invitedUser.id,
        );
        invitations = [...invitations, ...userInvitations];
      }

      const invitationPresent = invitations.find((invitation) => {
        return invitation.team?.id === req.input.teamId;
      });

      if (invitationPresent) {
        throw new TRPCError({ code: 'CONFLICT' });
      }

      if (invitedUser) {
        const member = await db.team.getUserTeam(
          req.input.teamId,
          invitedUser.id,
        );

        if (member) {
          throw new TRPCError({ code: 'CONFLICT' });
        }

        triggerUser(invitedUser.id);
      }

      const invitation = await db.user.inviteByEmail(
        req.input.email,
        req.ctx.user.sub,
        {
          teamId: req.input.teamId,
        },
        req.input.role,
      );

      return invitation;
    }),
  delete: teamAdminProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .mutation(async (req) => {
      const boards = await db.board.getBoardsByTeam(req.input.teamId);

      boards.forEach((board) => {
        revokeBoardAccess(board.id);
      });

      await db.team.deleteTeam(req.input.teamId);

      triggerTeam(req.input.teamId, req.ctx.correlationId);

      return {
        success: true,
      };
    }),
  changeRole: teamAdminProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        userId: z.string().max(256),
        role: z.enum(['admin', 'member']),
      }),
    )
    .mutation(async (req) => {
      await db.team.changeRole(
        req.input.teamId,
        req.input.userId,
        req.input.role,
      );

      checkTeamBoardsAccess(req.input.teamId);
      triggerTeam(req.input.teamId, req.ctx.correlationId);

      return {
        success: true,
      };
    }),
  deleteMember: teamAdminProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        memberId: z.string().max(256),
      }),
    )
    .mutation(async (req) => {
      const teamMembers = await db.team.getTeamMembers(req.input.teamId);
      const admins = teamMembers.filter(
        (member) => member.role === 'admin' && member.id !== req.input.memberId,
      );

      if (!admins.length) {
        throw new TRPCError({ code: 'CONFLICT' });
      }

      await db.team.deleteMember(req.input.teamId, req.input.memberId);

      checkTeamBoardsAccess(req.input.teamId);
      triggerTeam(req.input.teamId, req.ctx.correlationId);

      return {
        success: true,
      };
    }),
  leave: teamMemberProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
      }),
    )
    .mutation(async (req) => {
      await db.team.deleteMember(req.input.teamId, req.ctx.user.sub);

      checkTeamBoardsAccess(req.input.teamId);

      return {
        success: true,
      };
    }),
  rename: teamAdminProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        name: z.string().min(1).max(255),
      }),
    )
    .mutation(async (req) => {
      await db.team.renameTeam(req.input.teamId, req.input.name);

      triggerTeam(req.input.teamId, req.ctx.correlationId);

      return {
        success: true,
      };
    }),
  editInviteRole: protectedProcedure
    .input(
      z.object({
        inviteId: z.string().uuid(),
        role: z.enum(['member', 'admin']),
      }),
    )
    .mutation(async (req) => {
      const invitation = await db.user.getInvitation(req.input.inviteId);

      if (!invitation || !invitation.teamId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const admins = await db.team.getTeamAdmins(invitation.teamId);

      const isAdmin = !!admins.find(
        (admin) => admin.accountId === req.ctx.user.sub,
      );

      if (!isAdmin) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      await db.user.editInvitationRole(req.input.inviteId, req.input.role);

      return {
        success: true,
      };
    }),
  spaces: teamMemberProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
      }),
    )
    .query(async (req): Promise<Space[]> => {
      const spaces = await db.team.getSpacesByTeam(req.input.teamId);

      const spacesPromises = spaces.map(async (space) => {
        const boards = await getSpaceBoards(space.id);

        return {
          id: space.id,
          name: space.name,
          teamId: space.teamId,
          boards,
        };
      });

      return await Promise.all(spacesPromises);
    }),
  createSpace: teamMemberProcedure
    .input(
      z.object({
        teamId: z.string().uuid(),
        name: z.string().min(1).max(255),
        boards: z.array(z.string().uuid()).default([]),
      }),
    )
    .mutation(async (req): Promise<Space> => {
      const teamBoards = await db.board.getBoardsByTeam(req.input.teamId);
      const boardIds = teamBoards.map((board) => board.id);
      const validBoards = req.input.boards.every((boardId) =>
        boardIds.includes(boardId),
      );

      if (!validBoards) {
        throw new TRPCError({ code: 'BAD_REQUEST' });
      }

      const space = await createSpace(req.input.teamId, req.input.name);

      if (!space) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      }

      if (req.input.boards.length) {
        await addBoardsToSpace(space.id, req.input.boards);
      }

      triggerTeam(req.input.teamId, req.ctx.correlationId);

      const boards = await getSpaceBoards(space.id);

      return {
        id: space.id,
        name: space.name,
        teamId: space.teamId,
        boards,
      };
    }),
  updateSpace: protectedProcedure
    .input(
      z.object({
        spaceId: z.string().uuid(),
        name: z.string().min(1).max(255),
        boards: z.array(z.string().uuid()).default([]),
      }),
    )
    .mutation(async (req): Promise<Space> => {
      const space = await db.team.getSpace(req.input.spaceId);

      if (!space) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const userTeam = await db.team.getUserTeam(
        space.teamId,
        req.ctx.user.sub,
      );

      if (!userTeam) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      await db.team.renameSpace(req.input.spaceId, req.input.name);

      await db.team.deleteSpaceBoards(req.input.spaceId);

      if (req.input.boards.length) {
        await addBoardsToSpace(req.input.spaceId, req.input.boards);
      }

      triggerTeam(space.teamId, req.ctx.correlationId);

      const boards = await getSpaceBoards(space.id);

      return {
        id: space.id,
        name: req.input.name,
        teamId: space.teamId,
        boards,
      };
    }),
  deleteSpace: protectedProcedure
    .input(
      z.object({
        spaceId: z.string().uuid(),
      }),
    )
    .mutation(async (req) => {
      const space = await db.team.getSpace(req.input.spaceId);

      if (!space) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const userTeam = await db.team.getUserTeam(
        space.teamId,
        req.ctx.user.sub,
      );

      if (!userTeam) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      triggerTeam(space.teamId, req.ctx.correlationId);

      return await db.team.deleteSpace(req.input.spaceId);
    }),
});
