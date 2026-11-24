import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { db } from './init-db.js';
import * as schema from '../schema.js';
import {
  Board,
  TeamInvitation,
  TeamMember,
  UserTeam,
} from '@tapiz/board-commons';
import { SetNonNullable } from 'type-fest';
import { AdminRequiredConflict } from './admin-conflict.js';

export { AdminRequiredConflict };

export async function createTeam(
  name: string,
  userId: string,
): Promise<UserTeam> {
  const teams = await db.insert(schema.teams).values({ name }).returning();
  const team = teams[0];

  await db.insert(schema.teamMembers).values({
    accountId: userId,
    teamId: team.id,
    role: 'admin',
  });

  return {
    ...team,
    teamMember: {
      role: 'admin',
    },
  };
}

export async function getTeam(id: string) {
  const team = await db
    .select()
    .from(schema.teams)
    .where(eq(schema.teams.id, id));

  return team.at(0);
}

export async function getUserTeam(teamId: string, userId: string) {
  const team = await db
    .select()
    .from(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.accountId, userId),
      ),
    );

  return team.at(0);
}

export async function getUserTeams(userId: string): Promise<UserTeam[]> {
  const teams = await db
    .select()
    .from(schema.teams)
    .leftJoin(
      schema.teamMembers,
      and(
        eq(schema.teamMembers.teamId, schema.teams.id),
        eq(schema.teamMembers.accountId, userId),
      ),
    )
    .where(eq(schema.teamMembers.accountId, userId));

  return teams
    .filter((it): it is SetNonNullable<typeof it> => !!it.team_members)
    .map((team) => {
      return {
        ...team.teams,
        teamMember: {
          role: team.team_members?.role,
        },
      };
    });
}

export async function deleteTeam(teamId: string) {
  return db.delete(schema.teams).where(eq(schema.teams.id, teamId));
}

/**
 * Changes a member's team role. Demoting the last admin throws
 * AdminRequiredConflict; the check runs under a lock on the team, so two
 * concurrent demotions (or a demotion and an account removal) cannot both
 * pass it.
 */
export async function changeRole(
  teamId: string,
  userId: string,
  role: 'admin' | 'member',
) {
  return db.transaction(async (tx) => {
    await tx
      .select({ id: schema.teams.id })
      .from(schema.teams)
      .where(eq(schema.teams.id, teamId))
      .for('update');

    if (role !== 'admin') {
      const otherAdmins = await tx
        .select({ accountId: schema.teamMembers.accountId })
        .from(schema.teamMembers)
        .where(
          and(
            eq(schema.teamMembers.teamId, teamId),
            eq(schema.teamMembers.role, 'admin'),
            ne(schema.teamMembers.accountId, userId),
          ),
        );
      if (!otherAdmins.length) throw new AdminRequiredConflict();
    }

    await tx
      .update(schema.teamMembers)
      .set({ role })
      .where(
        and(
          eq(schema.teamMembers.teamId, teamId),
          eq(schema.teamMembers.accountId, userId),
        ),
      );
  });
}

export async function deleteStarredBoardsByUser(
  userId: string,
  boardIds: string[],
) {
  await db
    .delete(schema.starreds)
    .where(
      and(
        eq(schema.starreds.accountId, userId),
        inArray(schema.starreds.boardId, boardIds),
      ),
    );
}

/**
 * Removes someone from a team (kicked or leaving). Their roles on the team's
 * boards come from that membership, so they are removed too: otherwise a
 * board admin role (for example on boards they created) would keep granting
 * access. Board admins added explicitly without joining the team are not
 * affected, because they are never team members, and nothing happens when the
 * user is not a member.
 *
 * Throws AdminRequiredConflict when the last admin or the last member
 * would leave; the check runs under a lock on the team, so concurrent
 * removals cannot both pass it.
 *
 * Returns whether a membership was removed.
 */
export async function deleteMember(
  teamId: string,
  userId: string,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx
      .select({ id: schema.teams.id })
      .from(schema.teams)
      .where(eq(schema.teams.id, teamId))
      .for('update');

    const members = await tx
      .select({
        accountId: schema.teamMembers.accountId,
        role: schema.teamMembers.role,
      })
      .from(schema.teamMembers)
      .where(eq(schema.teamMembers.teamId, teamId));
    const member = members.find((it) => it.accountId === userId);

    if (!member) {
      return false;
    }

    const others = members.filter((it) => it.accountId !== userId);
    if (
      !others.length ||
      (member.role === 'admin' && !others.some((it) => it.role === 'admin'))
    ) {
      throw new AdminRequiredConflict();
    }

    await tx
      .delete(schema.teamMembers)
      .where(
        and(
          eq(schema.teamMembers.teamId, teamId),
          eq(schema.teamMembers.accountId, userId),
        ),
      );

    const teamBoards = tx
      .select({ id: schema.boards.id })
      .from(schema.boards)
      .where(eq(schema.boards.teamId, teamId));

    await tx
      .delete(schema.acountsToBoards)
      .where(
        and(
          eq(schema.acountsToBoards.accountId, userId),
          inArray(schema.acountsToBoards.boardId, teamBoards),
        ),
      );
    await tx
      .delete(schema.starreds)
      .where(
        and(
          eq(schema.starreds.accountId, userId),
          inArray(schema.starreds.boardId, teamBoards),
        ),
      );

    return true;
  });
}

export async function getTeamAdmins(teamId: string) {
  const admins = await db
    .select()
    .from(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.role, 'admin'),
      ),
    );

  return admins;
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const response = await db
    .select()
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.teamId, teamId))
    .leftJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
    .leftJoin(
      schema.accounts,
      eq(schema.teamMembers.accountId, schema.accounts.id),
    );

  return response
    .filter((it): it is SetNonNullable<typeof it> => !!it.accounts)
    .map((it) => {
      return {
        id: it.accounts?.id,
        name: it.accounts.name,
        email: it.accounts?.email,
        role: it.team_members?.role,
      };
    });
}

export async function getTeamInvitations(
  teamId: string,
): Promise<TeamInvitation[]> {
  const invitations = await db
    .select()
    .from(schema.invitations)
    .where(eq(schema.invitations.teamId, teamId))
    .orderBy(desc(schema.invitations.createdAt));

  return invitations.map((it) => {
    return {
      id: it.id,
      userId: it.userId,
      email: it.email,
      role: it.role,
      teamId: it.teamId,
      createdAt: it.createdAt,
    } as TeamInvitation;
  });
}

export async function renameTeam(teamId: string, name: string) {
  return db
    .update(schema.teams)
    .set({ name })
    .where(eq(schema.teams.id, teamId));
}

export async function getSpacesByTeam(teamId: string) {
  return db
    .select()
    .from(schema.spaces)
    .where(eq(schema.spaces.teamId, teamId));
}

export async function createSpace(teamId: string, name: string) {
  const spaces = await db
    .insert(schema.spaces)
    .values({ teamId, name })
    .returning();

  return spaces[0];
}

export async function addBoardsToSpace(spaceId: string, boardIds: string[]) {
  return db.insert(schema.spaceToBoards).values(
    boardIds.map((boardId) => {
      return {
        spaceId,
        boardId,
      };
    }),
  );
}

export async function deleteSpace(spaceId: string) {
  return db.delete(schema.spaces).where(eq(schema.spaces.id, spaceId));
}

export async function renameSpace(spaceId: string, name: string) {
  return db
    .update(schema.spaces)
    .set({ name })
    .where(eq(schema.spaces.id, spaceId));
}

export async function deleteSpaceBoards(spaceId: string) {
  return db
    .delete(schema.spaceToBoards)
    .where(eq(schema.spaceToBoards.spaceId, spaceId));
}

export async function getSpaceBoards(spaceId: string): Promise<Board[]> {
  const boards = await db
    .select()
    .from(schema.spaceToBoards)
    .where(eq(schema.spaceToBoards.spaceId, spaceId))
    .leftJoin(
      schema.boards,
      eq(schema.spaceToBoards.boardId, schema.boards.id),
    );

  return boards
    .filter((it): it is SetNonNullable<typeof it> => !!it.boards)
    .map((it) => {
      return it.boards;
    });
}

export async function getSpace(spaceId: string) {
  return (
    await db.select().from(schema.spaces).where(eq(schema.spaces.id, spaceId))
  ).at(0);
}

export async function haveAccessTeam(
  teamId: string,
  userId: string,
): Promise<boolean> {
  const team = await db
    .select()
    .from(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.accountId, userId),
      ),
    );

  return team.length > 0;
}
