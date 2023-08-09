import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import Config from '../config';

export let db: PostgresJsDatabase;

async function waitDb() {
  const connection = `postgres://${Config.DB_USER}:${Config.DB_PASSWORD}@${Config.DB_HOST}:${Config.DB_PORT}/${Config.DB_DATABASE}`;

  const migrationClient = postgres(connection, { max: 1 });

  await migrate(drizzle(migrationClient), { migrationsFolder: 'drizzle' });

  const queryClient = postgres(connection);

  db = drizzle(queryClient);

  return db;
}

export async function startDB() {
  const run = async () => {
    try {
      await waitDb();
    } catch (e) {
      console.log('Error connecting to DB, retrying in 2 seconds');
      setTimeout(run, 2000);
    }
  };

  await run();
}
