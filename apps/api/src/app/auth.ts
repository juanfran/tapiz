import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

if (!process.env['GOOGLE_CLIENT_ID'] || !process.env['GOOGLE_CLIENT_SECRET']) {
  throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _auth: any;

export function initAuth(db: PostgresJsDatabase) {
  _auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.accounts,
        session: schema.accountsToSession,
        account: schema.oauthAccounts,
        verification: schema.verification,
      },
    }),
    baseURL: process.env['API_URL']!,
    basePath: '/api/auth',
    socialProviders: {
      google: {
        clientId: process.env['GOOGLE_CLIENT_ID']!,
        clientSecret: process.env['GOOGLE_CLIENT_SECRET']!,
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google'],
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
  });

  return _auth;
}

export function getAuth() {
  if (!_auth) {
    throw new Error('Better Auth not initialized. Call initAuth() first.');
  }
  return _auth;
}

export async function validateSession(cookieHeader: string) {
  const session = await getAuth().api.getSession({
    headers: new Headers({ cookie: cookieHeader }),
  });
  return session;
}
