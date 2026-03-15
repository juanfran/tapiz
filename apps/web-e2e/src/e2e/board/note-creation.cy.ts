/**
 * E2E: Sticky note creation workflows
 *
 * Covers:
 *  1. Click-to-place via sticky note pad
 *  2. Drag-from-pad (tear-off) to place note
 *  3. N key shortcut
 *  4. Note color selection before placement
 *  5. Multiple notes (pinned mode)
 */

describe('Sticky Note Creation', () => {
  beforeEach(() => {
    cy.visit('/demo');
    cy.waitForBoard();
  });

  it('shows the sticky note pad in the toolbar', () => {
    cy.get('tapiz-sticky-note-pad').should('be.visible');
    cy.get('tapiz-sticky-note-pad .pad-stack').should('be.visible');
    cy.get('tapiz-sticky-note-pad .pad-key').should('contain.text', 'N');
  });

  it('activates note placement mode on pad click', () => {
    cy.get('tapiz-sticky-note-pad').click();
    // The pad gets the "active" class when note popup is open
    cy.get('tapiz-sticky-note-pad').should('have.class', 'active');
    // The note color picker popup should appear
    cy.get('tapiz-notes').should('be.visible');
  });

  it('places a note on the board after activating via pad click', () => {
    cy.get('tapiz-sticky-note-pad').click();
    // Click roughly in the center of the board canvas
    cy.get('tapiz-board').click(720, 450);
    // A note component should appear on the board
    cy.get('tapiz-note').should('have.length.at.least', 1);
  });

  it('activates note mode with N key shortcut', () => {
    cy.get('body').type('n');
    cy.get('tapiz-sticky-note-pad').should('have.class', 'active');
  });

  it('places a note using N key + board click', () => {
    cy.get('tapiz-note').then(($notes) => {
      const before = $notes.length;
      cy.get('body').type('n');
      cy.get('tapiz-board').click(600, 400);
      cy.get('tapiz-note').should('have.length.at.least', before + 1);
    });
  });

  it('creates a note via drag-from-pad (tear-off UX)', () => {
    cy.get('tapiz-note').then(($notes) => {
      const before = $notes.length;
      // Drag from the pad widget to the center of the board
      cy.dragNoteToCanvas(720, 450);
      cy.get('tapiz-note').should('have.length.at.least', before + 1);
    });
  });

  it('shows ghost note indicator during drag', () => {
    cy.get('tapiz-sticky-note-pad .pad-wrapper')
      .trigger('mousedown', { button: 0, force: true })
      .trigger('mousemove', { clientX: 400, clientY: 400, force: true });

    // Ghost note should appear once drag threshold is exceeded
    cy.get('tapiz-sticky-note-pad .ghost-note').should('be.visible');

    // Release
    cy.get('body').trigger('mouseup', { clientX: 400, clientY: 400 });
    cy.get('tapiz-sticky-note-pad .ghost-note').should('not.exist');
  });

  it('selects a note color before placing', () => {
    // Open note mode to see color picker
    cy.get('tapiz-sticky-note-pad').click();
    cy.get('tapiz-notes').should('be.visible');

    // Click on a specific color swatch (blue-ish)
    cy.get('tapiz-notes .note').first().click();

    // The pad should reflect the new color (not the default orange)
    cy.get('tapiz-sticky-note-pad .pad-layer.layer-1').should(
      'not.have.css',
      'background-color',
      'rgb(251, 185, 128)', // default #fbb980
    );
  });

  it('dismisses note mode with Escape key', () => {
    cy.get('tapiz-sticky-note-pad').click();
    cy.get('tapiz-sticky-note-pad').should('have.class', 'active');
    cy.get('body').type('{esc}');
    cy.get('tapiz-sticky-note-pad').should('not.have.class', 'active');
  });

  it('creates multiple notes in pinned mode', () => {
    cy.get('tapiz-sticky-note-pad').click();
    // Pin the popup
    cy.get('.toolbar-pinned button').click();

    // Place 3 notes
    cy.get('tapiz-board').click(500, 400);
    cy.get('tapiz-board').click(700, 400);
    cy.get('tapiz-board').click(900, 400);

    cy.get('tapiz-note').should('have.length.at.least', 3);
  });
});
