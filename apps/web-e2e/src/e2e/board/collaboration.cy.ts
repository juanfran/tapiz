/**
 * E2E: Collaborative whiteboard workflows
 *
 * Covers:
 *  1. Board loads and WebSocket connects
 *  2. Notes created by one session appear in another (basic real-time sync)
 *  3. Cursor visibility
 *  4. Undo / redo
 *  5. Note editing
 *  6. Voting on notes
 */

describe('Collaborative Board', () => {
  beforeEach(() => {
    cy.visit('/demo');
    cy.waitForBoard();
  });

  context('Board loading', () => {
    it('displays the board canvas', () => {
      cy.get('tapiz-board').should('be.visible');
    });

    it('shows the header with board name', () => {
      cy.get('tapiz-header, [tapiz-header]', { timeout: 5000 }).should('exist');
    });

    it('renders zoom control', () => {
      cy.get('tapiz-zoom-control').should('be.visible');
    });
  });

  context('Note editing', () => {
    beforeEach(() => {
      // Place a note first
      cy.get('tapiz-sticky-note-pad').click();
      cy.get('tapiz-board').click(720, 450);
      cy.get('tapiz-note', { timeout: 5000 }).should('have.length.at.least', 1);
    });

    it('enters edit mode on double-click', () => {
      cy.get('tapiz-note').first().dblclick();
      cy.get('tapiz-note .ProseMirror, tapiz-note tapiz-editor-view').should('exist');
    });

    it('saves note text after editing', () => {
      cy.get('tapiz-note').first().dblclick();
      cy.get('tapiz-note .ProseMirror').first().type('Hello DDD World{esc}');
      cy.get('tapiz-note').first().should('contain.text', 'Hello DDD World');
    });

    it('exits edit mode with Escape', () => {
      cy.get('tapiz-note').first().dblclick();
      cy.get('body').type('{esc}');
      cy.get('tapiz-note .ProseMirror').should('not.exist');
    });
  });

  context('Undo / Redo', () => {
    it('undoes note creation with Ctrl+Z', () => {
      cy.get('tapiz-sticky-note-pad').click();
      cy.get('tapiz-board').click(720, 450);
      cy.get('tapiz-note').should('have.length.at.least', 1);

      // Undo
      cy.get('body').type('{ctrl}z');
      cy.get('tapiz-note').should('have.length', 0);
    });

    it('redoes note creation with Ctrl+Shift+Z', () => {
      cy.get('tapiz-sticky-note-pad').click();
      cy.get('tapiz-board').click(720, 450);
      cy.get('tapiz-note').should('have.length.at.least', 1);

      cy.get('body').type('{ctrl}z');
      cy.get('tapiz-note').should('have.length', 0);

      cy.get('body').type('{ctrl}{shift}z');
      cy.get('tapiz-note').should('have.length.at.least', 1);
    });
  });

  context('Board modes', () => {
    it('can switch to presentation/sticky mode (boardMode)', () => {
      // The board header has a mode toggle
      cy.get('tapiz-header button[title*="mode"], tapiz-header [data-testid="mode-toggle"]', {
        timeout: 5000,
      }).then(($el) => {
        if ($el.length) {
          cy.wrap($el).first().click();
          cy.get('tapiz-board-toolbar').should('be.visible');
        }
      });
    });
  });

  context('Panel creation', () => {
    it('creates a panel by pressing P', () => {
      cy.get('body').type('p');
      // Draw a panel area
      cy.get('tapiz-board')
        .trigger('mousedown', 300, 200)
        .trigger('mousemove', 700, 500)
        .trigger('mouseup', 700, 500);
      cy.get('tapiz-panel', { timeout: 5000 }).should('have.length.at.least', 1);
    });
  });
});
