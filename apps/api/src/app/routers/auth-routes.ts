import { FastifyInstance } from 'fastify';
import { getUserInfo, lucia, validateAuthorizationCode } from '../auth.js';
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
        rep.setCookie('code', code, {
          path: '/',
          httpOnly: true,
        });

        const googleUser = await getUserInfo(tokens.accessToken);

        if (!googleUser || !googleUser.email) {
          rep.status(400).send();
          return;
        }

        const user = await getUserByGoogleId(googleUser.sub);
        if (user) {
          try {
            const session = await lucia.createSession(user.id, {});
            const sessionCookie = lucia.createSessionCookie(session.id);

            rep.setCookie(sessionCookie.name, sessionCookie.value, {
              ...sessionCookie.attributes,
            });
          } catch (e) {
            console.error(e);
          }

          await updateUser(
            user.id,
            googleUser.name,
            googleUser.email,
            googleUser.picture,
          );

          return rep.redirect(
            process.env['FRONTEND_URL'] + '/login-redirect?status=success',
          );
        } else {
          const userId = generateId(15);

          await db.user.createUser(
            userId,
            googleUser.name,
            googleUser.email,
            googleUser.picture,
            googleUser.sub,
          );

          const session = await lucia.createSession(userId, {});
          const sessionCookie = lucia.createSessionCookie(session.id);

          rep.setCookie(sessionCookie.name, sessionCookie.value, {
            ...sessionCookie.attributes,
          });

          return rep.redirect(
            process.env['FRONTEND_URL'] + '/login-redirect?status=success',
          );
        }
      }
    }

    rep.status(400).send();
  });
}
