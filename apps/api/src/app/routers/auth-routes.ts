import { FastifyInstance } from 'fastify';
import {
  createUserSessionCookie,
  getUserInfo,
  validateAuthorizationCode,
} from '../auth.js';
import { getUserByGoogleId, updateUser } from '../db/user-db.js';
import { generateId } from 'lucia';
import db from '../db/index.js';

export async function googleCallback(fastify: FastifyInstance) {
  fastify.get('/api/auth/callback', async (req, rep) => {
    const query = req.query as { code?: string; state?: string };

    const { code, state } = query;

    const storedState = req.cookies['state'];
    const storedCodeVerifier = req.cookies['code_verifier'];

    if (!code || !storedState || !storedCodeVerifier || state !== storedState) {
      rep.status(400).send();
      return;
    }

    if (query.code) {
      const tokens = await validateAuthorizationCode(
        query.code,
        storedCodeVerifier,
      );

      if (tokens) {
        const googleUser = await getUserInfo(tokens.accessToken);

        if (!googleUser || !googleUser.email) {
          rep.status(400).send();
          return;
        }

        const user = await getUserByGoogleId(googleUser.sub);
        const userId = user?.id ?? generateId(15);
        try {
          if (user) {
            await updateUser(
              userId,
              googleUser.name,
              googleUser.email,
              googleUser.picture,
            );
          } else {
            await db.user.createUser(
              userId,
              googleUser.name,
              googleUser.email,
              googleUser.picture,
              googleUser.sub,
            );
          }
        } catch (error) {
          if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === '23505'
          ) {
            return rep
              .status(409)
              .send('Account already exists; contact an administrator');
          }
          throw error;
        }

        const sessionCookie = await createUserSessionCookie(userId);
        rep.setCookie(
          sessionCookie.name,
          sessionCookie.value,
          sessionCookie.attributes,
        );
        return rep.redirect(
          process.env['FRONTEND_URL'] + '/login-redirect?status=success',
        );
      }
    }

    rep.status(400).send();
  });
}
