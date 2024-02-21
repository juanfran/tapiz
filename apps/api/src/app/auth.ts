import { FastifyReply } from 'fastify';
import Config from './config.js';
import { Google, generateCodeVerifier, generateState } from 'arctic';
import { Lucia, Session } from 'lucia';
import { PostgresJsAdapter } from '@lucia-auth/adapter-postgresql';
import postgres from 'postgres';

if (!Config.GOOGLE_CLIENT_ID || !Config.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

export let lucia: Lucia;

export const setPsqlClient = (psqlClient: postgres.Sql) => {
  const adapter = new PostgresJsAdapter(psqlClient, {
    user: 'accounts',
    session: 'account_session',
  });

  lucia = new Lucia(adapter, {
    getUserAttributes: (attributes) => {
      return {
        googleId: attributes.google_id,
        email: attributes.email,
      };
    },
  });
};

const google = new Google(
  Config.GOOGLE_CLIENT_ID,
  Config.GOOGLE_CLIENT_SECRET,
  `${Config.API_URL}/auth/callback`,
);

export const getAuthUrl = async (reply: FastifyReply) => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url = await google.createAuthorizationURL(state, codeVerifier, {
    scopes: ['openid', 'profile', 'email'],
  });

  url.searchParams.set('access_type', 'offline');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (reply as any).setCookie('state', state, {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 10,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (reply as any).setCookie('code_verifier', codeVerifier, {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 10,
  });

  return url;
};

export async function getUserInfo(token: string) {
  try {
    const response = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const reponse = await response.json();

    if (reponse.error) {
      console.error(reponse.error);
      return undefined;
    }

    return reponse;
  } catch (err) {
    console.error(err);
  }
}

export async function validateAuthorizationCode(
  code: string,
  codeVerifier: string,
) {
  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);

    return tokens;
  } catch (err) {
    console.error(err);
  }

  return undefined;
}

export async function validateSession(sessionId: string) {
  return lucia.validateSession(sessionId) as Promise<{
    user: {
      id: string;
      name: string;
      googleId: string;
      email: string;
    } | null;
    session: Session | null;
  }>;
}

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  name: string;
  google_id: number;
  email: string;
}
