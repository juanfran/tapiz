import { TRPCError } from '@trpc/server';
import { invitationMatchesEmail } from './invitation-email.js';
import { z } from 'zod/v4';
import { protectedProcedure, publicProcedure, router } from '../trpc.js';
import db from '../db/index.js';
import { getUserInvitationsByEmail } from '../db/user-db.js';
import { lucia } from '../auth.js';
import { userSettingsValidator } from '@tapiz/board-commons/validators/user-settings.validator.js';
import { withDefaultUserSettings } from '@tapiz/board-commons';
import { generateApiToken, hashApiToken } from '../api-token.js';
import { deleteUploadedFiles } from '../file-upload.js';
import { disconnectUser, revokeBoardAccess } from '../global.js';

export const userRouter = router({
  removeAccount: protectedProcedure.mutation(async (req) => {
    await lucia.invalidateUserSessions(req.ctx.user.sub);

    const removed = await db.user.removeAccount(req.ctx.user.sub);
    deleteUploadedFiles(removed.files);
    // Sockets are authenticated only when they connect, so close them now,
    // and drop everyone else from the boards that no longer exist.
    disconnectUser(req.ctx.user.sub);
    removed.boardIds.forEach((boardId) => revokeBoardAccess(boardId));

    return {
      success: true,
    };
  }),
  user: protectedProcedure.query(async (req) => {
    const user = await db.user.getUser(req.ctx.user.sub);

    return {
      name: req.ctx.user.name,
      id: req.ctx.user.sub,
      picture: req.ctx.user.picture ?? '',
      settings: withDefaultUserSettings(user?.settings),
    };
  }),
  settings: protectedProcedure.query(async (req) => {
    const user = await db.user.getUser(req.ctx.user.sub);

    return withDefaultUserSettings(user?.settings);
  }),
  updateSettings: protectedProcedure
    .input(userSettingsValidator)
    .mutation(async (req) => {
      const settings = withDefaultUserSettings(req.input);
      const savedSettings = await db.user.updateUserSettings(
        req.ctx.user.sub,
        settings,
      );

      return withDefaultUserSettings(savedSettings);
    }),
  apiToken: protectedProcedure.query(async (req) => {
    const tokenInfo = await db.user.getUserApiTokenInfo(req.ctx.user.sub);

    return tokenInfo ?? { hasToken: false, createdAt: null };
  }),
  generateApiToken: protectedProcedure.mutation(async (req) => {
    const token = generateApiToken();
    const createdAt = await db.user.updateUserApiToken(
      req.ctx.user.sub,
      hashApiToken(token),
    );

    return {
      token,
      createdAt,
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
        !invitationMatchesEmail(invitation.email, req.ctx.user.email)
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
          const admins = await db.board.getBoardAdmins(invitation.boardId);

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
