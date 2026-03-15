// ***********************************************
// Custom Cypress commands for the tapiz board app
// ***********************************************

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Log in via the Better Auth API directly (skips the Google OAuth flow).
       * Requires a local test user pre-seeded in the DB.
       */
      loginWithCredentials(email: string, password: string): Chainable<void>;

      /**
       * Create a fresh board and navigate to it.
       * Returns the board URL.
       */
      createBoard(name?: string): Chainable<string>;

      /**
       * Wait until the board canvas is fully loaded (WebSocket open + nodes rendered).
       */
      waitForBoard(): Chainable<void>;

      /**
       * Click on the sticky note pad in the toolbar to activate click-to-place mode.
       */
      activateNoteMode(): Chainable<void>;

      /**
       * Place a note at the given viewport coordinates by clicking on the canvas.
       */
      placeNoteAt(x: number, y: number): Chainable<void>;

      /**
       * Drag from the sticky note pad to the given canvas coordinates.
       */
      dragNoteToCanvas(targetX: number, targetY: number): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginWithCredentials', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/api/auth/sign-in/email`,
    body: { email, password },
    failOnStatusCode: false,
  }).then((response) => {
    expect(response.status, 'Login succeeded').to.be.oneOf([200, 201]);
  });
});

Cypress.Commands.add('createBoard', (name = `E2E Board ${Date.now()}`) => {
  return cy
    .request({
      method: 'POST',
      url: `${Cypress.env('API_URL')}/api/boards`,
      body: { name },
    })
    .then((response) => {
      const boardId = response.body.id as string;
      return `/board/${boardId}`;
    });
});

Cypress.Commands.add('waitForBoard', () => {
  // The board canvas element appears once the WebSocket has connected
  cy.get('tapiz-board', { timeout: 15000 }).should('exist');
  cy.get('.board-loaded, tapiz-nodes', { timeout: 15000 }).should('exist');
});

Cypress.Commands.add('activateNoteMode', () => {
  cy.get('tapiz-sticky-note-pad').click();
});

Cypress.Commands.add('placeNoteAt', (x: number, y: number) => {
  cy.get('tapiz-board').click(x, y);
});

Cypress.Commands.add('dragNoteToCanvas', (targetX: number, targetY: number) => {
  cy.get('tapiz-sticky-note-pad .pad-wrapper')
    .trigger('mousedown', { button: 0, force: true })
    .trigger('mousemove', { clientX: targetX - 20, clientY: targetY - 20, force: true })
    .then(() => {
      // Move significantly to trigger drag (> dragThreshold=8px)
      cy.get('tapiz-board')
        .trigger('mousemove', { clientX: targetX, clientY: targetY, force: true })
        .trigger('mouseup', { clientX: targetX, clientY: targetY, force: true });
    });
});

export {};
