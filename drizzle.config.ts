import type { Config } from 'drizzle-kit';
import AppConfig from './apps/api/src/app/config';

export default {
  schema: './apps/api/src/app/schema.ts',
  out: './drizzle',
  breakpoints: true,
  driver: 'pg',
  dbCredentials: {
    host: AppConfig.DB_HOST,
    port: AppConfig.DB_PORT,
    user: AppConfig.DB_USER,
    password: AppConfig.DB_PASSWORD,
    database: AppConfig.DB_DATABASE,
  },
} satisfies Config;
