import type { FastifyInstance } from 'fastify';
import { createUserSessionCookie } from '../auth.js';
import {
  clearOidcCookies,
  oidcAuthorizationUrl,
  oidcIdentity,
} from '../oidc.js';
import {
  createOidcUser,
  getUserByOidcIdentity,
} from '../db/user-db.js';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

export async function oidcRoutes(fastify: FastifyInstance) {
  fastify.get('/api/auth/oidc', async (_req, reply) => {
    try {
      const url = await oidcAuthorizationUrl(reply);
      return reply.redirect(url.href);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(503).send('OIDC provider unavailable');
    }
  });

  fastify.get('/api/auth/oidc/callback', async (req, reply) => {
    try {
      const identity = await oidcIdentity(req);
      clearOidcCookies(reply);
      let user = await getUserByOidcIdentity(identity.issuer, identity.subject);
      if (!user) {
        try {
          await createOidcUser(
            identity.issuer,
            identity.subject,
            identity.name,
            identity.email,
            identity.picture,
          );
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
          // A concurrent callback may have just created this same identity.
          // Never link by email; only the verified issuer and subject can win.
          user = await getUserByOidcIdentity(identity.issuer, identity.subject);
          if (!user) throw error;
        }
        user ??= await getUserByOidcIdentity(identity.issuer, identity.subject);
        if (!user) throw new Error('OIDC account creation failed');
      }
      const sessionCookie = await createUserSessionCookie(user.id);
      reply.setCookie(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      );
      return reply.redirect(
        `${process.env['FRONTEND_URL']}/login-redirect?status=success`,
      );
    } catch (error) {
      clearOidcCookies(reply);
      if (isUniqueViolation(error)) {
        return reply
          .status(409)
          .send('Account already exists; contact an administrator');
      }
      fastify.log.error(error);
      return reply.status(400).send('OIDC login failed');
    }
  });
}
