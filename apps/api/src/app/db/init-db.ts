import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { setPsqlClient } from '../auth.js';

export let db: PostgresJsDatabase;
export let psqlClient: postgres.Sql;

function getConnection() {
  const connection = `postgres://${process.env['POSTGRES_USER']}:${process.env['POSTGRES_PASSWORD']}@${process.env['POSTGRES_HOST']}:${process.env['POSTGRES_PORT_HOST']}/${process.env['POSTGRES_DB']}`;

  return connection;
}

function initDbClient() {
  const connection = getConnection();

  psqlClient = postgres(connection);

  db = drizzle(psqlClient);

  setPsqlClient(psqlClient);

  return db;
}

async function dbMigrate() {
  const connection = getConnection();
  const migrationClient = postgres(connection, { max: 1 });

  let migrationsFolder = 'drizzle';

  // npm run test:e2e
  if (process.cwd().includes('apps/api')) {
    migrationsFolder = '../../drizzle';
  }

  await migrate(drizzle(migrationClient), { migrationsFolder });

  return;
}

export async function startDB() {
  const run = async () => {
    try {
      dbMigrate();
      initDbClient();
    } catch (e) {
      console.log('Error connecting to DB, retrying in 2 seconds');
      setTimeout(run, 2000);
    }
  };

  await run();
}
