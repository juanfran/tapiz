import { eq, and, or, desc, sql, ne, inArray } from 'drizzle-orm';
import { db } from './init-db.js';
import * as schema from '../schema.js';
import {
  Invitation,
  Role,
  UserInvitation,
  UserSettings,
} from '@tapiz/board-commons';

export async function getUser(id: string) {
  const users = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.id, id));

  return users.at(0);
}

export async function getUserByOidcIdentity(issuer: string, subject: string) {
  const users = await db
    .select({ account: schema.accounts })
    .from(schema.oidcIdentities)
    .innerJoin(
      schema.accounts,
      eq(schema.oidcIdentities.accountId, schema.accounts.id),
    )
    .where(
      and(
        eq(schema.oidcIdentities.issuer, issuer),
        eq(schema.oidcIdentities.subject, subject),
      ),
    );

  return users.at(0)?.account;
}

export async function refreshOidcUser(
  issuer: string,
  subject: string,
  profile: { email: string; name?: string; picture?: string },
) {
  // The verified issuer/subject remains the account key. Never link by email.
  // PostgreSQL enforces email uniqueness; a collision aborts the login.
  // Name and picture are only refreshed when the provider sent them.
  const updated = await db
    .update(schema.accounts)
    .set({
      email: profile.email,
      ...(profile.name ? { name: profile.name } : {}),
      ...(profile.picture ? { picture: profile.picture } : {}),
    })
    .where(
      sql`${schema.accounts.id} = (
        select ${schema.oidcIdentities.accountId}
        from ${schema.oidcIdentities}
        where ${schema.oidcIdentities.issuer} = ${issuer}
          and ${schema.oidcIdentities.subject} = ${subject}
      )`,
    )
    .returning();
  return updated.at(0);
}

export async function createOidcUser(
  issuer: string,
  subject: string,
  name: string,
  email: string,
  picture?: string,
) {
  const userId = crypto.randomUUID();

  // Account and identity must be committed together. A duplicate email must
  // fail rather than implicitly link to an existing Google/OIDC account.
  await db.transaction(async (tx) => {
    await tx.insert(schema.accounts).values({
      id: userId,
      name,
      email,
      picture,
    });
    await tx.insert(schema.oidcIdentities).values({
      issuer,
      subject,
      accountId: userId,
    });
  });

  return userId;
}

export async function getUserByGoogleId(id: string) {
  const users = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.googleId, id));

  return users.at(0);
}

export async function getUserByName(name: string) {
  const users = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.name, name));

  return users[0];
}

export async function getUserByEmail(email: string) {
  const users = await db
    .select()
    .from(schema.accounts)
    .where(sql`lower(${schema.accounts.email}) = ${email.toLowerCase()}`);

  return users.at(0);
}

export async function getUserByApiTokenHash(apiTokenHash: string) {
  const users = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.apiTokenHash, apiTokenHash));

  return users.at(0);
}

/**
 * Deletes an account and settles what it leaves behind, in one transaction:
 * - teams where it was the only member are deleted (with their boards);
 * - teams where it was the last admin get a new admin;
 * - personal boards where it was the only member are deleted;
 * - personal boards where it was the last admin get a new admin (a member if
 *   possible, otherwise a guest), so they stay manageable. Team boards are
 *   administered by the team admins and need no promotion.
 * Other admins never change, and members are never promoted while an admin
 * remains. Returns the uploaded file names of the deleted boards so the caller
 * can remove them from disk once the transaction has committed.
 */
export async function removeAccount(userId: string): Promise<string[]> {
  return db.transaction(async (tx) => {
    const deletedTeamIds: string[] = [];
    const deletedBoardIds: string[] = [];

    const teamMemberships = await tx
      .select({
        teamId: schema.teamMembers.teamId,
        role: schema.teamMembers.role,
      })
      .from(schema.teamMembers)
      .where(eq(schema.teamMembers.accountId, userId));

    for (const membership of teamMemberships) {
      const others = await tx
        .select({
          accountId: schema.teamMembers.accountId,
          role: schema.teamMembers.role,
        })
        .from(schema.teamMembers)
        .where(
          and(
            eq(schema.teamMembers.teamId, membership.teamId),
            ne(schema.teamMembers.accountId, userId),
          ),
        )
        .orderBy(schema.teamMembers.accountId);

      if (!others.length) {
        deletedTeamIds.push(membership.teamId);
      } else if (
        membership.role === 'admin' &&
        !others.some((other) => other.role === 'admin')
      ) {
        await tx
          .update(schema.teamMembers)
          .set({ role: 'admin' })
          .where(
            and(
              eq(schema.teamMembers.teamId, membership.teamId),
              eq(schema.teamMembers.accountId, others[0].accountId),
            ),
          );
      }
    }

    const boardMemberships = await tx
      .select({
        boardId: schema.acountsToBoards.boardId,
        role: schema.acountsToBoards.role,
        teamId: schema.boards.teamId,
      })
      .from(schema.acountsToBoards)
      .innerJoin(
        schema.boards,
        eq(schema.boards.id, schema.acountsToBoards.boardId),
      )
      .where(eq(schema.acountsToBoards.accountId, userId));

    for (const membership of boardMemberships) {
      if (membership.teamId) continue;

      const others = await tx
        .select({
          accountId: schema.acountsToBoards.accountId,
          role: schema.acountsToBoards.role,
        })
        .from(schema.acountsToBoards)
        .where(
          and(
            eq(schema.acountsToBoards.boardId, membership.boardId),
            ne(schema.acountsToBoards.accountId, userId),
          ),
        )
        .orderBy(
          sql`${schema.acountsToBoards.lastAccessedAt} desc nulls last`,
          schema.acountsToBoards.accountId,
        );

      if (!others.length) {
        deletedBoardIds.push(membership.boardId);
      } else if (
        membership.role === 'admin' &&
        !others.some((other) => other.role === 'admin')
      ) {
        const newAdmin =
          others.find((other) => other.role === 'member') ?? others[0];
        await tx
          .update(schema.acountsToBoards)
          .set({ role: 'admin' })
          .where(
            and(
              eq(schema.acountsToBoards.boardId, membership.boardId),
              eq(schema.acountsToBoards.accountId, newAdmin.accountId),
            ),
          );
      }
    }

    // Boards of deleted teams are removed by the cascade; collect their files.
    const teamBoards = deletedTeamIds.length
      ? await tx
          .select({ id: schema.boards.id })
          .from(schema.boards)
          .where(inArray(schema.boards.teamId, deletedTeamIds))
      : [];
    const boardIds = [...deletedBoardIds, ...teamBoards.map((it) => it.id)];
    const files = boardIds.length
      ? await tx
          .select({ name: schema.boardFiles.name })
          .from(schema.boardFiles)
          .where(inArray(schema.boardFiles.boardId, boardIds))
      : [];

    if (deletedBoardIds.length) {
      await tx
        .delete(schema.boards)
        .where(inArray(schema.boards.id, deletedBoardIds));
    }
    if (deletedTeamIds.length) {
      await tx
        .delete(schema.teams)
        .where(inArray(schema.teams.id, deletedTeamIds));
    }
    await tx.delete(schema.accounts).where(eq(schema.accounts.id, userId));

    return files.map((file) => file.name);
  });
}

export async function updateUserSettings(
  userId: string,
  settings: UserSettings,
) {
  const users = await db
    .update(schema.accounts)
    .set({ settings })
    .where(eq(schema.accounts.id, userId))
    .returning({ settings: schema.accounts.settings });

  return users.at(0)?.settings;
}

export async function getUserApiTokenInfo(userId: string) {
  const users = await db
    .select({
      apiTokenHash: schema.accounts.apiTokenHash,
      apiTokenCreatedAt: schema.accounts.apiTokenCreatedAt,
    })
    .from(schema.accounts)
    .where(eq(schema.accounts.id, userId));

  const user = users.at(0);

  if (!user) {
    return null;
  }

  return {
    hasToken: !!user.apiTokenHash,
    createdAt: user.apiTokenCreatedAt,
  };
}

export async function updateUserApiToken(userId: string, apiTokenHash: string) {
  const users = await db
    .update(schema.accounts)
    .set({
      apiTokenHash,
      apiTokenCreatedAt: sql`now()`,
    })
    .where(eq(schema.accounts.id, userId))
    .returning({
      apiTokenCreatedAt: schema.accounts.apiTokenCreatedAt,
    });

  return users.at(0)?.apiTokenCreatedAt;
}

export async function createUser(
  userId: string,
  name: string,
  email: string,
  picture: string,
  googleId: string,
) {
  const insertedUser = await db
    .insert(schema.accounts)
    .values({ id: userId, name, email: email.toLowerCase(), picture, googleId })
    .onConflictDoUpdate({
      target: schema.accounts.id,
      set: {
        name,
      },
    });

  return insertedUser;
}

export async function updateUser(
  userId: string,
  name: string,
  email: string,
  picture: string,
) {
  return db
    .update(schema.accounts)
    .set({ name, picture, email: email.toLowerCase() })
    .where(eq(schema.accounts.id, userId));
}

export async function invite(
  userId: string,
  inviterId: string,
  content: {
    teamId?: string;
    boardId?: string;
  },
  role: Role,
) {
  const invitation = await db
    .insert(schema.invitations)
    .values({
      userId,
      inviterId,
      ...content,
      role,
    })
    .returning();

  return {
    id: invitation[0].id,
    userId: invitation[0].userId,
    role: invitation[0].role,
  } as Invitation;
}

export async function inviteByEmail(
  email: string,
  inviterId: string,
  content: {
    teamId?: string;
    boardId?: string;
  },
  role: Role,
) {
  const invitation = await db
    .insert(schema.invitations)
    .values({
      email: email.toLowerCase(),
      inviterId,
      ...content,
      role,
    })
    .returning();

  return {
    id: invitation[0].id,
    email: invitation[0].email,
    role: invitation[0].role,
  } as Invitation;
}

export function addTeamMember(
  userId: string,
  teamId: string,
  role: 'admin' | 'member',
) {
  return db.insert(schema.teamMembers).values({
    accountId: userId,
    teamId,
    role,
  });
}

export function addBoardMember(
  userId: string,
  boardId: string,
  role: 'admin' | 'member' | 'guest',
) {
  return db.insert(schema.acountsToBoards).values({
    accountId: userId,
    boardId,
    role,
  });
}

export async function acceptInvitation(
  userId: string,
  email: string,
  invitationId: string,
) {
  return db.transaction(async (tx) => {
    const [invitation] = await tx
      .delete(schema.invitations)
      .where(
        and(
          eq(schema.invitations.id, invitationId),
          or(
            eq(schema.invitations.userId, userId),
            sql`lower(${schema.invitations.email}) = ${email.toLowerCase()}`,
          ),
        ),
      )
      .returning();

    if (!invitation) return;
    if (invitation.teamId && invitation.role !== 'guest') {
      await tx
        .insert(schema.teamMembers)
        .values({
          accountId: userId,
          teamId: invitation.teamId,
          role: invitation.role,
        })
        .onConflictDoNothing();
    } else if (invitation.boardId) {
      await tx
        .insert(schema.acountsToBoards)
        .values({
          accountId: userId,
          boardId: invitation.boardId,
          role: invitation.role,
        })
        .onConflictDoNothing();
    }
    return true;
  });
}

export async function getUserInvitations(
  userId: string,
): Promise<UserInvitation[]> {
  const invitations = await db
    .select()
    .from(schema.invitations)
    .leftJoin(schema.teams, eq(schema.invitations.teamId, schema.teams.id))
    .where(eq(schema.invitations.userId, userId));

  return invitations.map((invitation) => {
    return {
      id: invitation.invitations.id,
      role: invitation.invitations.role,
      team: invitation.teams,
    } as UserInvitation;
  });
}

export async function getUserInvitationsByEmail(
  email: string,
): Promise<UserInvitation[]> {
  const invitations = await db
    .select()
    .from(schema.invitations)
    .leftJoin(schema.teams, eq(schema.invitations.teamId, schema.teams.id))
    .where(sql`lower(${schema.invitations.email}) = ${email.toLowerCase()}`);

  return invitations.map((invitation) => {
    return {
      id: invitation.invitations.id,
      role: invitation.invitations.role,
      team: invitation.teams,
    } as UserInvitation;
  });
}

export async function getInvitation(id: string) {
  const invitations = await db
    .select()
    .from(schema.invitations)
    .where(eq(schema.invitations.id, id));

  return invitations[0];
}

export async function deleteInvitation(id: string) {
  return db.delete(schema.invitations).where(eq(schema.invitations.id, id));
}

export async function editInvitationRole(id: string, role: Role) {
  return db
    .update(schema.invitations)
    .set({ role })
    .where(eq(schema.invitations.id, id));
}

export async function mentionUser(
  boardId: string,
  userId: string,
  nodeId?: string,
) {
  return db
    .insert(schema.notifications)
    .values({ boardId, userId, nodeId, type: 'mention' });
}

export async function getUserNotifications(
  userId: string,
  offset = 0,
  limit = 10,
) {
  const notifications = await db
    .select({
      id: schema.notifications.id,
      notificationId: schema.notifications.id,
      boardId: schema.notifications.boardId,
      userId: schema.notifications.userId,
      nodeId: schema.notifications.nodeId,
      createdAt: schema.notifications.createdAt,
      type: schema.notifications.type,
      userName: schema.accounts.name,
      boardName: schema.boards.name,
    })
    .from(schema.notifications)
    .leftJoin(
      schema.accounts,
      eq(schema.notifications.userId, schema.accounts.id),
    )
    .leftJoin(schema.boards, eq(schema.notifications.boardId, schema.boards.id))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(limit)
    .offset(offset)
    .where(eq(schema.notifications.userId, userId));

  return notifications;
}

export async function getUserNotificationsCount(
  userId: string,
): Promise<number> {
  const totalCount = await db
    .select({
      count: sql`COUNT(*)`,
    })
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, userId));

  return totalCount[0].count as number;
}

export async function clearUserNotifications(userId: string) {
  return db
    .delete(schema.notifications)
    .where(eq(schema.notifications.userId, userId));
}
