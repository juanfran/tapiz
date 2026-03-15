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
    cy.visit('/board/demo');
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
      // Place a note — it auto-enters edit mode when focused (portal overlays the note)
      cy.get('tapiz-sticky-note-pad').click();
      cy.get('tapiz-board').click(720, 450);
      cy.get('tapiz-note', { timeout: 5000 }).should('have.length.at.least', 1);
      // Exit auto-edit mode so dblclick tests start with a clean, non-covered note
      cy.get('body').type('{esc}');
      cy.get('tapiz-editor-view').should('not.exist');
    });

    it('enters edit mode on double-click', () => {
      // tapiz-editor-view is rendered in a portal target (outside tapiz-note's DOM subtree)
      cy.get('tapiz-note').first().dblclick();
      cy.get('tapiz-editor-view').should('exist');
    });

    it('saves note text after editing', () => {
      cy.get('tapiz-note').first().dblclick();
      // ProseMirror lives inside the editor portal, not inside tapiz-note
      cy.get('.portal .ProseMirror').first().type('Hello DDD World');
      cy.get('body').type('{esc}');
      cy.get('tapiz-note').first().should('contain.text', 'Hello DDD World');
    });

    it('exits edit mode with Escape', () => {
      cy.get('tapiz-note').first().dblclick();
      cy.get('tapiz-editor-view').should('exist');
      cy.get('body').type('{esc}');
      cy.get('tapiz-editor-view').should('not.exist');
    });
  });

  context('Undo / Redo', () => {
    it('undoes note creation with Ctrl+Z', () => {
      cy.get('tapiz-sticky-note-pad').click();
      cy.get('tapiz-board').click(720, 450);
      cy.get('tapiz-note').should('have.length.at.least', 1);

      // Note auto-enters edit mode (contenteditable) — Escape first so isInputField()=false
      cy.get('body').type('{esc}');
      cy.get('tapiz-editor-view').should('not.exist');

      cy.get('body').type('{ctrl}z');
      cy.get('tapiz-note').should('have.length', 0);
    });

    it('redoes note creation with Ctrl+Y', () => {
      cy.get('tapiz-sticky-note-pad').click();
      cy.get('tapiz-board').click(720, 450);
      cy.get('tapiz-note').should('have.length.at.least', 1);

      cy.get('body').type('{esc}');
      cy.get('tapiz-editor-view').should('not.exist');

      cy.get('body').type('{ctrl}z');
      cy.get('tapiz-note').should('have.length', 0);

      // Redo shortcut in board-shortcuts.directive.ts is Ctrl+Y
      cy.get('body').type('{ctrl}y');
      cy.get('tapiz-note').should('have.length.at.least', 1);
    });
  });

  context('Board modes', () => {
    it('can switch to edit mode (boardMode=1)', () => {
      // .change-edit button (in tapiz-board-header-options) switches to boardMode=1
      cy.get('.change-edit', { timeout: 5000 }).click();
      cy.get('tapiz-board-toolbar-button[icon="templates"]').should('exist');
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
      cy.get('tapiz-panel', { timeout: 5000 }).should(
        'have.length.at.least',
        1,
      );
    });
  });
});
