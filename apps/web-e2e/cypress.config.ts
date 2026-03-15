import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4300',
    specPattern: 'src/e2e/**/*.cy.ts',
    supportFile: 'src/support/e2e.ts',
    fixturesFolder: 'src/fixtures',
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1440,
    viewportHeight: 900,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    pageLoadTimeout: 30000,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    env: {
      // Override via cypress.env.json or environment variables
      API_URL: 'http://localhost:3000',
      TEST_USER_EMAIL: 'test@example.com',
      TEST_USER_PASSWORD: 'test-password-123',
    },
  },
});
