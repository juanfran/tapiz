import { eq, and, or, desc, sql } from 'drizzle-orm';
import { db } from './init-db.js';
import * as schema from '../schema.js';
import { Invitation, Role, UserInvitation } from '@tapiz/board-commons';

export async function getUser(id: string) {
  const users = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.id, id));

  return users.at(0);
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
    .where(eq(schema.accounts.email, email));

  return users.at(0);
}

export async function deleteAccount(userId: string): Promise<unknown> {
  return db.delete(schema.accounts).where(eq(schema.accounts.id, userId));
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
    .values({ id: userId, name, email, picture, googleId })
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
    .set({ name, picture, email })
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
      email,
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
  const invitations = await db
    .select()
    .from(schema.invitations)
    .where(
      and(
        eq(schema.invitations.id, invitationId),
        or(
          eq(schema.invitations.userId, userId),
          eq(schema.invitations.email, email),
        ),
      ),
    );

  if (!invitations.length) {
    return;
  }

  const invitation = invitations[0];

  if (invitation.teamId && invitation.role !== 'guest') {
    await addTeamMember(userId, invitation.teamId, invitation.role);
  } else if (invitation.boardId) {
    await addBoardMember(userId, invitation.boardId, invitation.role);
  }

  await db
    .delete(schema.invitations)
    .where(eq(schema.invitations.id, invitationId));

  return true;
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
    .where(eq(schema.invitations.email, email));

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
