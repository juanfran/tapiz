import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray, sql } from 'drizzle-orm';
import { db, psqlClient, startDB } from './init-db.js';
import { removeAccount } from './user-db.js';
import {
  accounts,
  accountsToSession,
  acountsToBoards,
  boardFiles,
  boards,
  invitations,
  teamMembers,
  teams,
} from '../schema.js';

type BoardRole = 'admin' | 'member' | 'guest';

/**
 * Opens pool connections up front: postgres.js connects lazily, so without
 * this the first of two "concurrent" transactions can finish before the
 * second even has a connection, and the race never happens.
 */
async function warmPool() {
  await Promise.all(
    Array.from({ length: 6 }, () => db.execute(sql`select pg_sleep(0.05)`)),
  );
}

const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** Starts a transaction that does `before`, waits for `release`, then `after`. */
function heldTransaction(
  before: (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  ) => Promise<unknown>,
  after: (
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  ) => Promise<unknown>,
) {
  let release!: () => void;
  const gate = new Promise<void>((done) => {
    release = done;
  });
  const done = db.transaction(async (tx) => {
    await before(tx);
    await gate;
    await after(tx);
  });
  return { release, done };
}

const accountIds: string[] = [];
const teamIds: string[] = [];
const boardIds: string[] = [];

async function account() {
  const id = `removal-${randomUUID()}`;
  await db
    .insert(accounts)
    .values({ id, name: id, email: `${id}@example.test` });
  accountIds.push(id);
  return id;
}

async function team(members: Record<string, 'admin' | 'member'>) {
  const [{ id }] = await db
    .insert(teams)
    .values({ name: 'Removal team' })
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

async function board(members: Record<string, BoardRole>, teamId?: string) {
  const [{ id }] = await db
    .insert(boards)
    .values({ name: 'Removal board', board: [], teamId })
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

async function teamRoles(teamId: string) {
  const rows = await db
    .select({ accountId: teamMembers.accountId, role: teamMembers.role })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  return Object.fromEntries(rows.map((row) => [row.accountId, row.role]));
}

async function boardRoles(boardId: string) {
  const rows = await db
    .select({
      accountId: acountsToBoards.accountId,
      role: acountsToBoards.role,
    })
    .from(acountsToBoards)
    .where(eq(acountsToBoards.boardId, boardId));
  return Object.fromEntries(rows.map((row) => [row.accountId, row.role]));
}

async function exists(table: typeof teams | typeof boards, id: string) {
  return (await db.select().from(table).where(eq(table.id, id))).length > 0;
}

// Runs against the configured POSTGRES_* database, like the other DB-backed
// API specs; it only deletes the rows it creates.
describe('account removal (PostgreSQL)', () => {
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

  it('does not promote anyone when a regular member leaves', async () => {
    const [admin, leaving, other] = [
      await account(),
      await account(),
      await account(),
    ];
    const teamId = await team({
      [admin]: 'admin',
      [leaving]: 'member',
      [other]: 'member',
    });
    const boardId = await board({
      [admin]: 'admin',
      [leaving]: 'member',
      [other]: 'member',
    });

    await removeAccount(leaving);

    expect(await teamRoles(teamId)).toEqual({
      [admin]: 'admin',
      [other]: 'member',
    });
    expect(await boardRoles(boardId)).toEqual({
      [admin]: 'admin',
      [other]: 'member',
    });
  });

  it('does not promote anyone when another admin remains', async () => {
    const [leaving, admin, other] = [
      await account(),
      await account(),
      await account(),
    ];
    const teamId = await team({
      [leaving]: 'admin',
      [admin]: 'admin',
      [other]: 'member',
    });
    const boardId = await board({
      [leaving]: 'admin',
      [admin]: 'admin',
      [other]: 'member',
    });

    await removeAccount(leaving);

    expect(await teamRoles(teamId)).toEqual({
      [admin]: 'admin',
      [other]: 'member',
    });
    expect(await boardRoles(boardId)).toEqual({
      [admin]: 'admin',
      [other]: 'member',
    });
  });

  it('promotes exactly one member when the last team admin leaves', async () => {
    const [leaving, first, second] = [
      await account(),
      await account(),
      await account(),
    ];
    const teamId = await team({
      [leaving]: 'admin',
      [first]: 'member',
      [second]: 'member',
    });

    await removeAccount(leaving);

    const roles = Object.values(await teamRoles(teamId));
    expect(roles.sort()).toEqual(['admin', 'member']);
  });

  it('prefers a member over a guest when the last board admin leaves', async () => {
    const [leaving, guest, member] = [
      await account(),
      await account(),
      await account(),
    ];
    const boardId = await board({
      [leaving]: 'admin',
      [guest]: 'guest',
      [member]: 'member',
    });

    // The guest was active more recently, so the role, not recency, decides.
    await db
      .update(acountsToBoards)
      .set({ lastAccessedAt: new Date().toISOString() })
      .where(eq(acountsToBoards.accountId, guest));

    await removeAccount(leaving);

    expect(await boardRoles(boardId)).toEqual({
      [guest]: 'guest',
      [member]: 'admin',
    });
  });

  it('promotes a guest when only guests remain on a personal board', async () => {
    const [leaving, guest] = [await account(), await account()];
    const boardId = await board({ [leaving]: 'admin', [guest]: 'guest' });

    await removeAccount(leaving);

    expect(await boardRoles(boardId)).toEqual({ [guest]: 'admin' });
  });

  it('deletes sole-member teams and personal boards and returns their files', async () => {
    const leaving = await account();
    const teamId = await team({ [leaving]: 'admin' });
    const teamBoard = await board({ [leaving]: 'admin' }, teamId);
    const personalBoard = await board({ [leaving]: 'admin' });
    await db.insert(boardFiles).values([
      { boardId: teamBoard, name: 'team-file.png' },
      { boardId: personalBoard, name: 'personal-file.png' },
    ]);

    const removed = await removeAccount(leaving);

    expect(removed.files.sort()).toEqual([
      'personal-file.png',
      'team-file.png',
    ]);
    expect(removed.boardIds.sort()).toEqual([personalBoard, teamBoard].sort());
    expect(await exists(teams, teamId)).toBe(false);
    expect(await exists(boards, teamBoard)).toBe(false);
    expect(await exists(boards, personalBoard)).toBe(false);
  });

  it('keeps team boards and shared boards that other people still use', async () => {
    const [leaving, teammate] = [await account(), await account()];
    const teamId = await team({ [teammate]: 'admin', [leaving]: 'member' });
    // The team still owns this board even though nobody else joined it.
    const teamBoard = await board({ [leaving]: 'admin' }, teamId);

    const removed = await removeAccount(leaving);

    expect(removed).toMatchObject({ boardIds: [], files: [] });
    expect(await exists(boards, teamBoard)).toBe(true);
    expect(await boardRoles(teamBoard)).toEqual({});
  });

  it("keeps a deleted team's boards that other people use, as personal boards", async () => {
    const [leaving, externalAdmin, externalMember] = [
      await account(),
      await account(),
      await account(),
    ];
    const teamId = await team({ [leaving]: 'admin' });
    const adminBoard = await board(
      { [leaving]: 'admin', [externalAdmin]: 'admin' },
      teamId,
    );
    const memberBoard = await board(
      { [leaving]: 'admin', [externalMember]: 'member' },
      teamId,
    );
    const unusedBoard = await board({ [leaving]: 'admin' }, teamId);

    const removed = await removeAccount(leaving);

    expect(removed.boardIds).toEqual([unusedBoard]);
    expect(await exists(teams, teamId)).toBe(false);
    expect(await exists(boards, unusedBoard)).toBe(false);
    for (const boardId of [adminBoard, memberBoard]) {
      const [row] = await db
        .select({ teamId: boards.teamId })
        .from(boards)
        .where(eq(boards.id, boardId));
      expect(row).toEqual({ teamId: null });
    }
    expect(await boardRoles(adminBoard)).toEqual({ [externalAdmin]: 'admin' });
    expect(await boardRoles(memberBoard)).toEqual({
      [externalMember]: 'admin',
    });
  });

  it('handles more than ten boards', async () => {
    const [leaving, other] = [await account(), await account()];
    const shared: string[] = [];
    for (let i = 0; i < 12; i++) {
      shared.push(await board({ [leaving]: 'admin', [other]: 'member' }));
    }

    await removeAccount(leaving);

    for (const boardId of shared) {
      expect(await boardRoles(boardId)).toEqual({ [other]: 'admin' });
    }
  });

  it('deletes the account', async () => {
    const leaving = await account();

    await removeAccount(leaving);

    expect(
      await db.select().from(accounts).where(eq(accounts.id, leaving)),
    ).toHaveLength(0);
  });

  it('keeps a team manageable when its two admins leave at once', async () => {
    const [first, second, member] = [
      await account(),
      await account(),
      await account(),
    ];
    const teamId = await team({
      [first]: 'admin',
      [second]: 'admin',
      [member]: 'member',
    });

    await warmPool();
    const results = await Promise.all([
      removeAccount(first),
      removeAccount(second),
    ]);

    expect(await teamRoles(teamId)).toEqual({ [member]: 'admin' });
    expect(results.flatMap((result) => result.updatedTeamIds)).toEqual([
      teamId,
    ]);
  });

  it('keeps a personal board manageable when its two admins leave at once', async () => {
    const [first, second, member] = [
      await account(),
      await account(),
      await account(),
    ];
    const boardId = await board({
      [first]: 'admin',
      [second]: 'admin',
      [member]: 'member',
    });

    await warmPool();
    const results = await Promise.all([
      removeAccount(first),
      removeAccount(second),
    ]);

    expect(await boardRoles(boardId)).toEqual({ [member]: 'admin' });
    expect(results.flatMap((result) => result.updatedBoardIds)).toEqual([
      boardId,
    ]);
  });

  it('completes when a login creates a session during the removal', async () => {
    const leaving = await account();
    await warmPool();
    const login = heldTransaction(
      (tx) =>
        tx.insert(accountsToSession).values({
          id: `session-${randomUUID()}`,
          userId: leaving,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      async () => undefined,
    );
    await pause(50);
    const removing = removeAccount(leaving);
    await pause(100);
    login.release();

    await Promise.all([login.done, removing]);

    expect(
      await db.select().from(accounts).where(eq(accounts.id, leaving)),
    ).toHaveLength(0);
  });

  it('completes when an invitation it sent is accepted during the removal', async () => {
    const [inviter, invitee] = [await account(), await account()];
    const teamId = await team({ [inviter]: 'admin' });
    const [{ id: invitationId }] = await db
      .insert(invitations)
      .values({ teamId, inviterId: inviter, userId: invitee, role: 'member' })
      .returning({ id: invitations.id });

    await warmPool();
    const accepting = heldTransaction(
      (tx) => tx.delete(invitations).where(eq(invitations.id, invitationId)),
      (tx) =>
        tx
          .insert(teamMembers)
          .values({ teamId, accountId: invitee, role: 'member' }),
    );
    await pause(50);
    const removing = removeAccount(inviter);
    await pause(100);
    accepting.release();

    await Promise.all([accepting.done, removing]);

    // The new member joined first, so the team survives with them as admin.
    expect(await teamRoles(teamId)).toEqual({ [invitee]: 'admin' });
  });

  it('deletes the sessions in the same transaction', async () => {
    const leaving = await account();
    await db.insert(accountsToSession).values({
      id: `session-${randomUUID()}`,
      userId: leaving,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await removeAccount(leaving);

    expect(
      await db
        .select()
        .from(accountsToSession)
        .where(eq(accountsToSession.userId, leaving)),
    ).toHaveLength(0);
  });

  it('deletes invitations sent to or by the user, including email ones', async () => {
    const [leaving, admin] = [await account(), await account()];
    const teamId = await team({ [admin]: 'admin' });
    const [leavingAccount] = await db
      .select({ email: accounts.email })
      .from(accounts)
      .where(eq(accounts.id, leaving));
    const rows = await db
      .insert(invitations)
      .values([
        // Sent by the leaving user.
        { teamId, inviterId: leaving, email: 'someone@example.test' },
        // Addressed to the leaving user, by id and by (mixed-case) email.
        { teamId, inviterId: admin, userId: leaving },
        { teamId, inviterId: admin, email: leavingAccount.email.toUpperCase() },
        // Unrelated.
        { teamId, inviterId: admin, email: 'unrelated@example.test' },
      ])
      .returning({ id: invitations.id, email: invitations.email });

    await removeAccount(leaving);

    const remaining = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(
        inArray(
          invitations.id,
          rows.map((row) => row.id),
        ),
      );
    expect(remaining).toEqual([{ id: rows[3].id }]);
  });

  it('reports who was promoted', async () => {
    const [leaving, member] = [await account(), await account()];
    const teamId = await team({ [leaving]: 'admin', [member]: 'member' });
    const boardId = await board({ [leaving]: 'admin', [member]: 'member' });

    const removed = await removeAccount(leaving);

    expect(removed.promotions).toEqual(
      expect.arrayContaining([
        { teamId, userId: member },
        { boardId, userId: member },
      ]),
    );
    expect(removed.promotions).toHaveLength(2);
  });
});
