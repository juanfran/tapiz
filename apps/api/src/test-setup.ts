import { vi } from 'vitest';
import { getAuth } from './tests/test-helpers.js';

vi.mock('./app/auth', async () => {
  return {
    validateSession: (id: string) => {
      const auth = getAuth(Number(id));
      return Promise.resolve({
        user: {
          id: auth.sub,
          email: auth.email,
          googleId: auth.googleId,
          name: auth.name,
        },
        session: 'test',
      });
    },
    lucia: {
      sessionCookieName: 'auth',
      invalidateUserSessions: vi.fn(),
    },
    setPsqlClient: () => {
      return;
    },
  };
});
