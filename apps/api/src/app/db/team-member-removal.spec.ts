import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { db, psqlClient, startDB } from './init-db.js';
import { deleteMember } from './team-db.js';
import { haveAccess } from './board-db.js';
import {
  accounts,
  acountsToBoards,
  boards,
  starreds,
  teamMembers,
  teams,
} from '../schema.js';

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
});
