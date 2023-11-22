import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from './init-db';
import * as schema from '../schema';
import { TeamInvitation, TeamMember, UserTeam } from '@team-up/board-commons';
import { SetNonNullable } from 'type-fest';
import { getUsersBoardsByTeam } from './board-db';

export async function createTeam(name: string, userId: string) {
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
  } as UserTeam;
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
      eq(schema.teamMembers.teamId, schema.teams.id),
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

export async function changeRole(
  teamId: string,
  userId: string,
  role: 'admin' | 'member',
) {
  return db
    .update(schema.teamMembers)
    .set({ role })
    .where(
      and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.accountId, userId),
      ),
    );
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

export async function deleteMember(teamId: string, userId: string) {
  await db
    .delete(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.accountId, userId),
      ),
    );

  const boards = await getUsersBoardsByTeam(userId, teamId);

  const ids = boards.map((it) => it.id);

  if (ids.length) {
    await deleteStarredBoardsByUser(
      userId,
      boards.map((it) => it.id),
    );
  }
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

export async function getTeamMembers(teamId: string) {
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
      } as TeamMember;
    });
}

export async function getTeamInvitations(teamId: string) {
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
