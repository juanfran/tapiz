import postgres from 'postgres';
import Config from './config.js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';

// delete database and recreate it with migrations
export async function regenerateDatabase() {
  const connectionMigration = `postgres://${Config.DB_USER}:${Config.DB_PASSWORD}@${Config.DB_HOST}:${Config.DB_PORT}/postgres`;

  const sql = postgres(connectionMigration, { max: 1 });

  await sql`DROP DATABASE IF EXISTS ${sql(Config.DB_DATABASE)}`;
  await sql`CREATE DATABASE ${sql(Config.DB_DATABASE)}`;
  await sql.end();

  const connection = `postgres://${Config.DB_USER}:${Config.DB_PASSWORD}@${Config.DB_HOST}:${Config.DB_PORT}/${Config.DB_DATABASE}`;

  const migrationClient = postgres(connection, { max: 1 });

  await migrate(drizzle(migrationClient), { migrationsFolder: 'drizzle' });
  process.exit();
}

regenerateDatabase();
