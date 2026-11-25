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
import {
  checkBoardAccess,
  checkTeamBoardsAccess,
  disconnectUser,
  revalidateUserSubscriptions,
  revokeBoardAccess,
} from '../global.js';
import { sendEvent, sendUserEvent } from '../subscriptor.js';

export const userRouter = router({
  removeAccount: protectedProcedure.mutation(async (req) => {
    // Sessions are deleted inside the same transaction.
    const removed = await db.user.removeAccount(req.ctx.user.sub);

    // The account is gone at this point; cleanup failures are logged rather
    // than reported as a failed deletion.
    try {
      deleteUploadedFiles(removed.files);
      // Sockets are authenticated only when they connect, so close them now,
      // drop everyone else from the boards that no longer exist, and refresh
      // the cached admin rights of people promoted on the remaining ones.
      disconnectUser(req.ctx.user.sub);
      removed.boardIds.forEach((boardId) => revokeBoardAccess(boardId));
      removed.updatedBoardIds.forEach((boardId) => checkBoardAccess(boardId));
      removed.updatedTeamIds.forEach((teamId) => checkTeamBoardsAccess(teamId));
      // Same events as a manual role change, so open pages update.
      for (const promotion of removed.promotions) {
        if ('teamId' in promotion) {
          // The web app listens to its own user events, not to team rooms.
          sendUserEvent({
            event: 'teamRoleChanged',
            userId: promotion.userId,
            content: { teamId: promotion.teamId, role: 'admin' },
          });
          sendEvent(
            {
              room: `team:${promotion.teamId}`,
              event: 'changeRoleTeam',
              content: { userId: promotion.userId, role: 'admin' },
            },
            req.ctx.correlationId,
          );
        } else {
          sendEvent(
            {
              room: `board:${promotion.boardId}`,
              event: 'changeRoleBoard',
              content: { userId: promotion.userId, role: 'admin' },
            },
            req.ctx.correlationId,
          );
        }
      }
    } catch (error) {
      console.error('Account removal cleanup failed', error);
    }

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

      // An access grant: realtime checks still in progress (a denied `sub`,
      // an older revalidation) must not decide with what they read before.
      revalidateUserSubscriptions(req.ctx.user.sub);

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
