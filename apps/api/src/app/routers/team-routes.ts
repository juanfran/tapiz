import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router, teamAdminProcedure } from '../trpc.js';
import db from '../db/index.js';
import { checkTeamBoardsAccess, revokeBoardAccess } from '../global.js';
import { triggerTeam } from '../subscriptor.js';

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

      return {
        success: true,
      };
    }),
  leave: protectedProcedure
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
});
