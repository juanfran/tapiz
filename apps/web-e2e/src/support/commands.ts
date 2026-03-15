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

      /**
       * Zoom out so all board nodes fit within the viewport.
       * Dispatches wheel events on the board to zoom out.
       */
      zoomToFit(steps?: number): Chainable<void>;
    }
  }
}

Cypress.Commands.add(
  'loginWithCredentials',
  (email: string, password: string) => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('API_URL')}/api/auth/sign-in/email`,
      body: { email, password },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status, 'Login succeeded').to.be.oneOf([200, 201]);
    });
  },
);

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
  // The board's inner .container div has [class.loading]="!loaded()" with display:none
  // tapiz-board itself never gets .loading — must check the inner container
  cy.get('tapiz-board', { timeout: 15000 }).should('exist');
  cy.get('tapiz-board .container:not(.loading)', { timeout: 20000 }).should(
    'exist',
  );
  // Wait for the deferred toolbar block to render (Angular @defer on idle)
  cy.get('tapiz-board-toolbar', { timeout: 15000 }).should('exist');
  cy.get('tapiz-nodes', { timeout: 15000 }).should('exist');
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
    .trigger('mousemove', {
      clientX: targetX - 20,
      clientY: targetY - 20,
      force: true,
    })
    .then(() => {
      // Move significantly to trigger drag (> dragThreshold=8px)
      cy.get('tapiz-board')
        .trigger('mousemove', {
          clientX: targetX,
          clientY: targetY,
          force: true,
        })
        .trigger('mouseup', {
          clientX: targetX,
          clientY: targetY,
          force: true,
        });
    });
});

Cypress.Commands.add('zoomToFit', (steps = 15) => {
  cy.get('tapiz-board').then(($board) => {
    for (let i = 0; i < steps; i++) {
      $board[0].dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: 100,
          clientX: 500,
          clientY: 330,
          bubbles: true,
        }),
      );
    }
  });
  // Allow rendering to settle after zoom
  cy.wait(300);
});

export {};
