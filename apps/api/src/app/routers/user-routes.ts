import { TRPCError } from '@trpc/server';
import { z } from 'zod/v4';
import { protectedProcedure, publicProcedure, router } from '../trpc.js';
import db from '../db/index.js';
import { getUserInvitationsByEmail } from '../db/user-db.js';
import { lucia } from '../auth.js';

export const userRouter = router({
  removeAccount: protectedProcedure.mutation(async (req) => {
    await lucia.invalidateUserSessions(req.ctx.user.sub);

    let teams = await db.team.getUserTeams(req.ctx.user.sub);

    teams = teams.filter(async (team) => {
      const members = await db.team.getTeamMembers(team.id);

      return members.length === 1;
    });

    const teamsWithMembers: string[] = [];
    const teamsWithoutMembers: string[] = [];

    for (const team of teams) {
      const members = await db.team.getTeamMembers(team.id);

      if (members.length === 1) {
        teamsWithoutMembers.push(team.id);
      } else {
        teamsWithMembers.push(team.id);
      }
    }

    teamsWithoutMembers.forEach(async (teamId) => {
      await db.team.deleteTeam(teamId);
    });

    teamsWithMembers.forEach(async (teamId) => {
      const members = await db.team.getTeamMembers(teamId);

      const newOwner = members.find((member) => member.id !== req.ctx.user.sub);

      if (newOwner) {
        await db.team.changeRole(teamId, newOwner.id, 'admin');
      }
    });

    const boards = await db.board.getBoards(req.ctx.user.sub);

    boards.forEach(async (board) => {
      const members = await db.board.getBoardUsers(board.id);

      if (members.length === 1 && !board.teamId) {
        db.board.deleteBoard(board.id);
      } else if (members.length > 1) {
        const newOwner = members.find(
          (member) => member.id !== req.ctx.user.sub,
        );

        if (newOwner) {
          await db.board.changeRole(board.id, newOwner.id, 'admin');
        }
      }
    });

    await db.user.deleteAccount(req.ctx.user.sub);

    return {
      success: true,
    };
  }),
  user: protectedProcedure.query(async (req) => {
    return {
      name: req.ctx.user.name,
      id: req.ctx.user.sub,
      picture: req.ctx.user.picture ?? '',
    };
  }),
  invites: protectedProcedure.query(async (req) => {
    const email = req.ctx.user.email;

    const invitationsEmail = await getUserInvitationsByEmail(email);
    const invitations = await db.user.getUserInvitations(req.ctx.user.sub);

    return [...invitationsEmail, ...invitations];
  }),
  acceptInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async (req) => {
      const result = await db.user.acceptInvitation(
        req.ctx.user.sub,
        req.ctx.user.email,
        req.input.inviteId,
      );

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return {
        success: true,
      };
    }),
  cancelInvite: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async (req) => {
      const invitation = await db.user.getInvitation(req.input.inviteId);

      if (!invitation) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      let authError = false;

      if (
        invitation.inviterId !== req.ctx.user.sub &&
        invitation.userId !== req.ctx.user.sub &&
        invitation.email !== req.ctx.user.email
      ) {
        if (invitation.teamId) {
          const admins = await db.team.getTeamAdmins(invitation.teamId);

          const isAdmin = !!admins.find(
            (admin) => admin.accountId === req.ctx.user.sub,
          );

          if (!isAdmin) {
            authError = true;
          }
        } else if (invitation.boardId) {
          const admins = await db.board.getAllBoardAdmins(invitation.boardId);

          const isAdmin = admins.includes(req.ctx.user.sub);

          if (!isAdmin) {
            authError = true;
          }
        }
      }

      if (authError) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      await db.user.deleteInvitation(req.input.inviteId);

      return {
        success: true,
      };
    }),
  logout: publicProcedure.query(async (req) => {
    const mayLogout: { user?: { sub: string } } = req.ctx;

    if (mayLogout.user) {
      await lucia.invalidateUserSessions(mayLogout.user.sub);
    }

    return {
      success: true,
    };
  }),
  notifications: protectedProcedure
    .input(z.object({ offset: z.number().int().optional().default(0) }))
    .query(async (req) => {
      const notifications = await db.user.getUserNotifications(
        req.ctx.user.sub,
        req.input.offset,
      );

      const size = await db.user.getUserNotificationsCount(req.ctx.user.sub);

      return {
        items: notifications,
        size,
      };
    }),
  clearNotifications: protectedProcedure.mutation(async (req) => {
    await db.user.clearUserNotifications(req.ctx.user.sub);

    return {
      success: true,
    };
  }),
});
