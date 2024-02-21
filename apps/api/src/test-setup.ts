import { getAuth } from './tests/test-helpers.js';

jest.mock('./app/auth', () => {
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
    },
  };
});
