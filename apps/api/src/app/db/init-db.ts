import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import Config from '../config.js';
import { setPsqlClient } from '../auth.js';

export let db: PostgresJsDatabase;
export let psqlClient: postgres.Sql;

async function waitDb() {
  const connection = `postgres://${Config.DB_USER}:${Config.DB_PASSWORD}@${Config.DB_HOST}:${Config.DB_PORT}/${Config.DB_DATABASE}`;

  psqlClient = postgres(connection);

  db = drizzle(psqlClient);

  setPsqlClient(psqlClient);

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
