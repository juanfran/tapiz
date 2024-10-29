import {
  pgTable,
  json,
  varchar,
  uuid,
  timestamp,
  primaryKey,
  boolean,
  unique,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { TuNode } from '@tapiz/board-commons';

export const roleEnum = pgEnum('role', ['admin', 'member']);
export const roleEnumWithGuest = pgEnum('role', ['admin', 'member', 'guest']);

export const accounts = pgTable('accounts', {
  id: varchar('id', { length: 256 }).primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  picture: varchar('picture'),
  googleId: varchar('google_id').unique(),
});

export const accountsToSession = pgTable('account_session', {
  id: varchar('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  userId: varchar('user_id')
    .notNull()
    .references(() => accounts.id),
});

export const usersRelations = relations(accounts, ({ many }) => ({
  accountsToBoards: many(acountsToBoards),
}));

export const boards = pgTable('boards', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  board: json('board').$type<TuNode[]>().notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  public: boolean('public').notNull().default(false),
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
    privateId: uuid('private_id').defaultRandom().notNull(),
    role: roleEnumWithGuest('role').notNull().default('member'),
    lastAccessedAt: timestamp('last_accessed_at', { mode: 'string' }),
  },
  (t) => ({
    pk: primaryKey(t.accountId, t.boardId),
  }),
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
  }),
);

export const starreds = pgTable(
  'starreds',
  {
    accountId: varchar('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    boardId: uuid('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey(t.accountId, t.boardId),
  }),
);

export const teams = pgTable('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
});

export const teamMembers = pgTable(
  'team_members',
  {
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    accountId: varchar('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull().default('member'),
  },
  (t) => ({
    pk: primaryKey(t.teamId, t.accountId),
  }),
);

export const teamRelations = relations(teams, ({ many }) => ({
  boards: many(boards),
}));

export const teamMemberRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  account: one(accounts, {
    fields: [teamMembers.accountId],
    references: [accounts.id],
  }),
}));

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }),
    userId: varchar('user_id').references(() => accounts.id, {
      onDelete: 'cascade',
    }),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
    boardId: uuid('board_id').references(() => boards.id, {
      onDelete: 'cascade',
    }),
    inviterId: varchar('inviter_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    role: roleEnumWithGuest('role').notNull().default('member'),
    createdAt: timestamp('created_at', { mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    unqTeam: unique().on(t.teamId, t.userId),
    unqBoard: unique().on(t.boardId, t.userId),
    unqTeamEmail: unique().on(t.teamId, t.email),
    unqBoardEmail: unique().on(t.boardId, t.email),
  }),
);

export const invitationRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  board: one(boards, {
    fields: [invitations.boardId],
    references: [boards.id],
  }),
  inviter: one(accounts, {
    fields: [invitations.inviterId],
    references: [accounts.id],
  }),
  user: one(accounts, {
    fields: [invitations.userId],
    references: [accounts.id],
  }),
}));

export const boardFiles = pgTable('board_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id')
    .notNull()
    .references(() => boards.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 256 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: varchar('type', { length: 256 }).notNull(),
  boardId: uuid('board_id').references(() => boards.id, {
    onDelete: 'cascade',
  }),
  userId: varchar('user_id').references(() => accounts.id, {
    onDelete: 'cascade',
  }),
  nodeId: uuid('node_id'),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
});
