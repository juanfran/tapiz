import { DBState, User } from '@team-up/board-commons';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as postgres from 'postgres';
import * as schema from './schema';

import Config from './config';
import { and, desc, eq } from 'drizzle-orm';

import { SetNonNullable } from 'type-fest';

let db: PostgresJsDatabase;

async function waitDb() {
  const connection = `postgres://${Config.DB_USER}:${Config.DB_PASSWORD}@${Config.DB_HOST}:${Config.DB_PORT}/${Config.DB_DATABASE}`;

  const migrationClient = postgres(connection, { max: 1 });

  await migrate(drizzle(migrationClient), { migrationsFolder: 'drizzle' });

  const queryClient = postgres(connection);

  db = drizzle(queryClient);

  return db;
}

export async function startDB() {
  const run = () => {
    try {
      waitDb();
    } catch (e) {
      console.log('Error connecting to DB, retrying in 2 seconds');
      setTimeout(run, 2000);
    }
  };

  run();
}

export async function getBoard(boardId: string) {
  try {
    const results = await db
      .select()
      .from(schema.boards)
      .where(eq(schema.boards.id, boardId));

    return results[0];
  } catch (e) {
    console.error(e);

    return null;
  }
}

export async function getBoardOwners(boardId: string) {
  const results = await db
    .select({
      id: schema.acountsToBoards.accountId,
    })
    .from(schema.acountsToBoards)
    .where(
      and(
        eq(schema.acountsToBoards.boardId, boardId),
        eq(schema.acountsToBoards.isOwner, true)
      )
    );

  return results.map((it) => it.id);
}

export async function getBoardUser(boardId: string, userId: User['id']) {
  const results = await db
    .select({
      visible: schema.acountsToBoards.visible,
    })
    .from(schema.acountsToBoards)
    .where(
      and(
        eq(schema.acountsToBoards.boardId, boardId),
        eq(schema.acountsToBoards.accountId, userId)
      )
    );

  return results[0];
}

export async function getBoardUsers(boardId: string) {
  const results = await db
    .select({
      id: schema.acountsToBoards.accountId,
      visible: schema.acountsToBoards.visible,
      accounts: {
        name: schema.accounts.name,
      },
    })
    .from(schema.acountsToBoards)
    .leftJoin(
      schema.accounts,
      eq(schema.accounts.id, schema.acountsToBoards.accountId)
    )
    .where(eq(schema.acountsToBoards.boardId, boardId));

  return results
    .filter((it): it is SetNonNullable<typeof it> => !!it.accounts)
    .map((result) => ({
      id: result.id,
      visible: result.visible,
      name: result.accounts.name,
    }));
}

export async function getBoards(ownerId: string) {
  const results = await db
    .select({
      id: schema.boards.id,
      name: schema.boards.name,
      createdAt: schema.boards.createdAt,
      acountsToBoards: {
        owner: schema.acountsToBoards.isOwner,
      },
    })
    .from(schema.boards)
    .leftJoin(
      schema.acountsToBoards,
      eq(schema.acountsToBoards.boardId, schema.boards.id)
    )
    .where(eq(schema.acountsToBoards.accountId, ownerId))
    .orderBy(desc(schema.boards.createdAt));

  return results
    .filter((it): it is SetNonNullable<typeof it> => !!it.acountsToBoards)
    .map((result) => ({
      id: result.id,
      name: result.name,
      createdAt: result.createdAt,
      owner: result.acountsToBoards.owner,
    }));
}

export async function createBoard(
  name = 'New board',
  ownerId: string,
  board: DBState
) {
  const result = await db
    .insert(schema.boards)
    .values({ name, board: board })
    .returning();

  const boardId = result[0].id;

  if (boardId) {
    await db
      .insert(schema.acountsToBoards)
      .values({ accountId: ownerId, boardId, isOwner: true });

    return boardId;
  }

  return new Error('Error creating project');
}

export async function deleteBoard(boardId: string) {
  return db.delete(schema.boards).where(eq(schema.boards.id, boardId));
}

export async function leaveBoard(userId: string, boardId: string) {
  return db
    .delete(schema.acountsToBoards)
    .where(
      and(
        eq(schema.acountsToBoards.accountId, userId),
        eq(schema.acountsToBoards.boardId, boardId)
      )
    );
}

export async function joinBoard(
  userId: string,
  boardId: string
): Promise<void> {
  const result = await db
    .select()
    .from(schema.boards)
    .leftJoin(
      schema.acountsToBoards,
      eq(schema.boards.id, schema.acountsToBoards.boardId)
    )
    .where(
      and(
        eq(schema.acountsToBoards.accountId, userId),
        eq(schema.acountsToBoards.boardId, boardId)
      )
    );

  if (result && !result.length) {
    await db.insert(schema.acountsToBoards).values({
      accountId: userId,
      boardId,
      isOwner: false,
      visible: false,
    });
  }
}

export async function updateBoard(id: string, board: DBState) {
  const dbState = {
    notes: board.notes,
    groups: board.groups,
    panels: board.panels,
    images: board.images,
    texts: board.texts,
    vectors: board.vectors,
  } as DBState;
  return db
    .update(schema.boards)
    .set({ board: dbState })
    .where(eq(schema.boards.id, id));
}

export async function updateAccountBoard(
  boardId: string,
  userId: User['id'],
  visible: boolean
) {
  return db
    .update(schema.acountsToBoards)
    .set({ visible })
    .where(
      and(
        eq(schema.acountsToBoards.accountId, userId),
        eq(schema.acountsToBoards.boardId, boardId)
      )
    );
}

export async function updateBoardName(id: string, name: string) {
  return db.update(schema.boards).set({ name }).where(eq(schema.boards.id, id));
}

export async function getUserByName(name: string) {
  return db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.name, name));
}

export async function deleteAccount(userId: string): Promise<unknown> {
  return db.delete(schema.accounts).where(eq(schema.accounts.id, userId));
}

export async function createUser(userId: string, name: string) {
  return db
    .insert(schema.accounts)
    .values({ id: userId, name })
    .onConflictDoUpdate({
      target: schema.accounts.id,
      set: {
        name,
      },
    });
}
