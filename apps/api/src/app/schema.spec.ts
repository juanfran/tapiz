import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { describe, expect, it, beforeAll, afterEach } from 'vitest';
import { UserSettings, defaultUserSettings } from '@tapiz/board-commons';
import { db, psqlClient, startDB } from './db/init-db';
import { accounts } from './schema';
import { eq } from 'drizzle-orm';

const createdUserIds: string[] = [];

async function insertUser(settings?: UserSettings) {
  const id = randomUUID();

  createdUserIds.push(id);
  await db.insert(accounts).values({
    id,
    name: 'Migration test user',
    email: `${id}@tapiz.test`,
    ...(settings ? { settings } : {}),
  });

  return id;
}

async function readSettings(id: string) {
  const rows = await db
    .select({ settings: accounts.settings })
    .from(accounts)
    .where(eq(accounts.id, id));

  return rows.at(0)?.settings;
}

async function runWheelInputModeMigration() {
  const migration = readFileSync(
    new URL('../../../../drizzle/0010_bored_killmonger.sql', import.meta.url),
    'utf8',
  );

  for (const statement of migration.split('--> statement-breakpoint')) {
    await psqlClient.unsafe(statement);
  }
}

describe('accounts settings schema', () => {
  beforeAll(async () => {
    await startDB();
  });

  afterEach(async () => {
    if (createdUserIds.length === 0) {
      return;
    }

    await Promise.all(
      createdUserIds
        .splice(0)
        .map((id) => db.delete(accounts).where(eq(accounts.id, id))),
    );
  });

  it('stores auto as the default wheel input mode for new accounts', async () => {
    const userId = await insertUser();

    expect((await readSettings(userId))?.wheelInputMode).toBe('auto');
  });

  it('idempotently backfills legacy settings without replacing an explicit mode', async () => {
    const legacySettings = {
      noteDefaults: defaultUserSettings.noteDefaults,
    } as UserSettings;
    const legacyUserId = await insertUser(legacySettings);
    const trackpadUserId = await insertUser({
      ...defaultUserSettings,
      wheelInputMode: 'trackpad',
    });

    expect((await readSettings(trackpadUserId))?.wheelInputMode).toBe(
      'trackpad',
    );

    await runWheelInputModeMigration();

    expect((await readSettings(trackpadUserId))?.wheelInputMode).toBe(
      'trackpad',
    );

    await runWheelInputModeMigration();

    expect((await readSettings(legacyUserId))?.wheelInputMode).toBe('auto');
    expect((await readSettings(trackpadUserId))?.wheelInputMode).toBe(
      'trackpad',
    );
  });
});
