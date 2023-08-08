import {
  pgTable,
  json,
  varchar,
  uuid,
  timestamp,
  primaryKey,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { DBState } from '@team-up/board-commons';

export const accounts = pgTable('accounts', {
  id: varchar('id', { length: 256 }).primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
});

export const usersRelations = relations(accounts, ({ many }) => ({
  accountsToBoards: many(acountsToBoards),
}));

export const boards = pgTable('boards', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  board: json('board').$type<DBState>().notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
});

export const boardsRelations = relations(boards, ({ many }) => ({
  accountsToBoards: many(acountsToBoards),
}));

export const acountsToBoards = pgTable(
  'accounts_boards',
  {
    accountId: varchar('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    boardId: uuid('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    isOwner: boolean('isOwner').notNull().default(false),
    visible: boolean('visible').notNull().default(false),
  },
  (t) => ({
    pk: primaryKey(t.accountId, t.boardId),
  })
);

export const accountsToBoardsRelations = relations(
  acountsToBoards,
  ({ one }) => ({
    board: one(boards, {
      fields: [acountsToBoards.boardId],
      references: [boards.id],
    }),
    account: one(accounts, {
      fields: [acountsToBoards.accountId],
      references: [accounts.id],
    }),
  })
);
