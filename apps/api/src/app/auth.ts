import admin from 'firebase-admin';
// import { psqlClient } from './db/init-db.js';

// import { lucia } from 'lucia';
// import { node } from 'lucia/middleware';
// import { postgres as postgresAdapter } from '@lucia-auth/adapter-postgresql';
// import { Sql } from 'postgres';

// export function initAuth(psqlClient: Sql) {
//   const auth = lucia({
//     env: 'DEV', // "PROD"
//     middleware: node(),
//     adapter: postgresAdapter(psqlClient, {
//       user: 'auth_user',
//       key: 'user_key',
//       session: 'user_session',
//     }),
//   });

//   return auth;
// }

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

// initAuth(psqlClient);

export async function verifyToken(token: string) {
  try {
    const payload = await admin.auth().verifyIdToken(token);

    if (payload && payload['sub'] && payload['name'] && payload['email']) {
      return {
        sub: payload['sub'],
        name: payload['name'],
        email: payload['email'],
      };
    }
  } catch (err) {
    console.error(err);
  }

  return undefined;
}
