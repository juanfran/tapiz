import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import Config from '../config.js';

const connection = `postgres://${Config.DB_USER}:${Config.DB_PASSWORD}@${Config.DB_HOST}:${Config.DB_PORT}/${Config.DB_DATABASE}`;

const migrationClient = postgres(connection, { max: 1 });

await migrate(drizzle(migrationClient), { migrationsFolder: './drizzle' });

process.exit(0);
