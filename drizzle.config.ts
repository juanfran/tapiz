import type { Config } from 'drizzle-kit';

export default {
  schema: './apps/api/src/app/schema.ts',
  out: './drizzle',
  breakpoints: true,
  driver: 'pg',
  dbCredentials: {
    host: process.env['POSTGRES_HOST']!,
    port: Number(process.env['POSTGRES_PORT_HOST']!),
    user: process.env['POSTGRES_USER'],
    password: process.env['POSTGRES_PASSWORD'],
    database: process.env['POSTGRES_DB']!,
  },
} satisfies Config;
