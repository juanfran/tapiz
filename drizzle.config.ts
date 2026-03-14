import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './apps/api/src/app/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env['POSTGRES_HOST']!,
    port: Number(process.env['POSTGRES_PORT_HOST']!),
    user: process.env['POSTGRES_USER'],
    password: process.env['POSTGRES_PASSWORD'],
    database: process.env['POSTGRES_DB']!,
  },
});
