import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { setPsqlClient } from '../auth.js';

export let db: PostgresJsDatabase;
export let psqlClient: postgres.Sql;

function waitDb() {
  const connection = `postgres://${process.env['POSTGRES_USER']}:${process.env['POSTGRES_PASSWORD']}@${process.env['POSTGRES_HOST']}:${process.env['POSTGRES_PORT_HOST']}/${process.env['POSTGRES_DB']}`;

  psqlClient = postgres(connection);

  db = drizzle(psqlClient);

  setPsqlClient(psqlClient);

  return db;
}

export async function startDB() {
  const run = async () => {
    try {
      waitDb();
    } catch (e) {
      console.log('Error connecting to DB, retrying in 2 seconds');
      setTimeout(run, 2000);
    }
  };

  await run();
}
