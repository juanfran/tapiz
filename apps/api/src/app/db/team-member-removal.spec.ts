import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, psqlClient, startDB } from './init-db.js';
import { changeRole, deleteMember, AdminRequiredConflict } from './team-db.js';
import {
  changeRole as changeBoardRole,
  createBoard,
  NotTeamMemberError,
} from './board-db.js';
import { haveAccess } from './board-db.js';
import {
  accounts,
  acountsToBoards,
  boards,
  starreds,
  teamMembers,
  teams,
} from '../schema.js';

// postgres.js connects lazily; open connections so the race really happens.
async function warmPool() {
  await Promise.all(
    Array.from({ length: 6 }, () => db.execute(sql`select pg_sleep(0.05)`)),
  );
}

/** Exactly one call succeeded and the other was refused for the admin rule. */
function expectOneConflict(results: PromiseSettledResult<unknown>[]) {
  expect(results.map((result) => result.status).sort()).toEqual([
    'fulfilled',
    'rejected',
  ]);
  const rejected = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );
  expect(rejected?.reason).toBeInstanceOf(AdminRequiredConflict);
}

const accountIds: string[] = [];
const teamIds: string[] = [];
const boardIds: string[] = [];

async function account() {
  const id = `team-removal-${randomUUID()}`;
  await db
    .insert(accounts)
    .values({ id, name: id, email: `${id}@example.test` });
  accountIds.push(id);
  return id;
}

async function board(
  members: Record<string, 'admin' | 'member' | 'guest'>,
  teamId?: string,
) {
  const [{ id }] = await db
    .insert(boards)
    .values({ name: 'Team removal board', board: [], teamId })
    .returning({ id: boards.id });
  boardIds.push(id);
  await db.insert(acountsToBoards).values(
    Object.entries(members).map(([accountId, role]) => ({
      boardId: id,
      accountId,
      role,
    })),
  );
  return id;
}

async function boardRole(boardId: string, accountId: string) {
  const [row] = await db
    .select({ role: acountsToBoards.role })
    .from(acountsToBoards)
    .where(
      and(
        eq(acountsToBoards.boardId, boardId),
        eq(acountsToBoards.accountId, accountId),
      ),
    );
  return row?.role;
}

// Runs against the configured POSTGRES_* database, like the other DB-backed
// API specs; it only deletes the rows it creates.
describe('team member removal (PostgreSQL)', () => {
  beforeAll(async () => {
    await startDB();
  });
  afterEach(async () => {
    if (boardIds.length) {
      await db.delete(boards).where(inArray(boards.id, boardIds.splice(0)));
    }
    if (teamIds.length) {
      await db.delete(teams).where(inArray(teams.id, teamIds.splice(0)));
    }
    if (accountIds.length) {
      await db
        .delete(accounts)
        .where(inArray(accounts.id, accountIds.splice(0)));
    }
  });
  afterAll(async () => {
    await psqlClient.end();
  });

  it("revokes the team's boards, including ones the member administers", async () => {
    const [admin, removed, external] = [
      await account(),
      await account(),
      await account(),
    ];
    const [{ id: teamId }] = await db
      .insert(teams)
      .values({ name: 'Team removal' })
      .returning({ id: teams.id });
    teamIds.push(teamId);
    await db.insert(teamMembers).values([
      { teamId, accountId: admin, role: 'admin' },
      { teamId, accountId: removed, role: 'member' },
    ]);
    // `removed` created this team board, so it administers it; `external`
    // was added as a board admin without joining the team.
    const teamBoard = await board(
      { [removed]: 'admin', [external]: 'admin' },
      teamId,
    );
    const otherBoard = await board({ [removed]: 'admin' });
    await db.insert(starreds).values([
      { accountId: removed, boardId: teamBoard },
      { accountId: removed, boardId: otherBoard },
    ]);
    expect(await haveAccess(teamBoard, removed)).toBe(true);

    await deleteMember(teamId, removed);

    expect(await haveAccess(teamBoard, removed)).toBe(false);
    expect(await boardRole(teamBoard, removed)).toBeUndefined();
    expect(await haveAccess(teamBoard, external)).toBe(true);
    expect(await boardRole(otherBoard, removed)).toBe('admin');
    expect(
      (
        await db
          .select({ boardId: starreds.boardId })
          .from(starreds)
          .where(eq(starreds.accountId, removed))
      ).map((row) => row.boardId),
    ).toEqual([otherBoard]);
  });

  async function teamWith(members: Record<string, 'admin' | 'member'>) {
    const [{ id }] = await db
      .insert(teams)
      .values({ name: 'Team removal' })
      .returning({ id: teams.id });
    teamIds.push(id);
    await db.insert(teamMembers).values(
      Object.entries(members).map(([accountId, role]) => ({
        teamId: id,
        accountId,
        role,
      })),
    );
    return id;
  }

  it('does nothing for someone who is not a team member', async () => {
    const [admin, external] = [await account(), await account()];
    const teamId = await teamWith({ [admin]: 'admin' });
    const teamBoard = await board({ [external]: 'admin' }, teamId);

    expect(await deleteMember(teamId, external)).toBe(false);

    expect(await boardRole(teamBoard, external)).toBe('admin');
    expect(await haveAccess(teamBoard, external)).toBe(true);
  });

  it('rejects removing the last admin or the last member', async () => {
    const [admin, member, alone] = [
      await account(),
      await account(),
      await account(),
    ];
    const teamId = await teamWith({ [admin]: 'admin', [member]: 'member' });
    const soloTeam = await teamWith({ [alone]: 'admin' });
    const teamBoard = await board({ [admin]: 'admin' }, teamId);

    await expect(deleteMember(teamId, admin)).rejects.toBeInstanceOf(
      AdminRequiredConflict,
    );
    await expect(deleteMember(soloTeam, alone)).rejects.toBeInstanceOf(
      AdminRequiredConflict,
    );
    expect(await boardRole(teamBoard, admin)).toBe('admin');
    expect(await deleteMember(teamId, member)).toBe(true);
  });

  it('lets only one of two admins leave at the same time', async () => {
    const [first, second, member] = [
      await account(),
      await account(),
      await account(),
    ];
    const teamId = await teamWith({
      [first]: 'admin',
      [second]: 'admin',
      [member]: 'member',
    });

    await warmPool();
    const results = await Promise.allSettled([
      deleteMember(teamId, first),
      deleteMember(teamId, second),
    ]);

    expectOneConflict(results);
    const roles = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));
    expect(roles.map((row) => row.role).sort()).toEqual(['admin', 'member']);
  });

  it('rejects the last non-admin member of a team without admins', async () => {
    const alone = await account();
    const teamId = await teamWith({ [alone]: 'member' });

    await expect(deleteMember(teamId, alone)).rejects.toBeInstanceOf(
      AdminRequiredConflict,
    );
  });

  it('keeps one team admin when two admins demote each other at once', async () => {
    const [first, second] = [await account(), await account()];
    const teamId = await teamWith({ [first]: 'admin', [second]: 'admin' });

    await warmPool();
    const results = await Promise.allSettled([
      changeRole(teamId, first, 'member'),
      changeRole(teamId, second, 'member'),
    ]);

    expectOneConflict(results);
    const roles = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));
    expect(roles.map((row) => row.role).sort()).toEqual(['admin', 'member']);
  });

  it('keeps one board admin when two admins demote each other at once', async () => {
    const [first, second] = [await account(), await account()];
    const boardId = await board({ [first]: 'admin', [second]: 'admin' });

    await warmPool();
    const results = await Promise.allSettled([
      changeBoardRole(boardId, first, 'member'),
      changeBoardRole(boardId, second, 'member'),
    ]);

    expectOneConflict(results);
    expect(
      [
        await boardRole(boardId, first),
        await boardRole(boardId, second),
      ].sort(),
    ).toEqual(['admin', 'member']);
  });

  it('does not let a removed member create a board in the team', async () => {
    const [admin, removed] = [await account(), await account()];
    const teamId = await teamWith({ [admin]: 'admin', [removed]: 'member' });
    await deleteMember(teamId, removed);

    await expect(
      createBoard('After removal', removed, [], teamId, {
        requireTeamMember: true,
      }),
    ).rejects.toBeInstanceOf(NotTeamMemberError);

    const created = await createBoard('Member board', admin, [], teamId, {
      requireTeamMember: true,
    });
    boardIds.push(created.id);
    expect(await boardRole(created.id, admin)).toBe('admin');
  });

  it('counts team admins as admins of a team board', async () => {
    const [teamAdmin, boardAdmin] = [await account(), await account()];
    const teamId = await teamWith({
      [teamAdmin]: 'admin',
      [boardAdmin]: 'member',
    });
    const teamBoard = await board({ [boardAdmin]: 'admin' }, teamId);
    const personalBoard = await board({ [boardAdmin]: 'admin' });

    await changeBoardRole(teamBoard, boardAdmin, 'member');
    expect(await boardRole(teamBoard, boardAdmin)).toBe('member');

    await expect(
      changeBoardRole(personalBoard, boardAdmin, 'member'),
    ).rejects.toBeInstanceOf(AdminRequiredConflict);
  });
});
