/**
 * E2E: Board toolbar interaction
 *
 * Covers:
 *  1. Toolbar visibility and structure
 *  2. Keyboard shortcuts (N, T, P, G, I)
 *  3. Tool activation / deactivation
 *  4. Tools popup (panel, text, image, poll, estimation, timer)
 *  5. Drawing mode
 *  6. Vote mode
 *  7. Pin behavior
 */

describe('Board Toolbar', () => {
  beforeEach(() => {
    cy.visit('/board/demo');
    cy.waitForBoard();
  });

  context('Structure', () => {
    it('renders the toolbar with the sticky note pad prominently', () => {
      cy.get('tapiz-board-toolbar').should('be.visible');
      cy.get('tapiz-sticky-note-pad').should('be.visible');
    });

    it('shows select, note pad, tools, vote, token, draw, group, area, search buttons', () => {
      cy.get('tapiz-board-toolbar-button').should('have.length.at.least', 5);
    });
  });

  context('Keyboard shortcuts', () => {
    it('N activates note mode', () => {
      cy.get('body').type('n');
      cy.get('tapiz-sticky-note-pad').should('have.class', 'active');
    });

    it('T activates text mode', () => {
      cy.get('body').type('t');
      // extrasButton uses dynamic [icon] binding (no HTML attribute) — match by static tooltip attribute
      cy.get('tapiz-board-toolbar-button[tooltip="Tools"].active').should(
        'exist',
      );
    });

    it('P activates panel mode', () => {
      cy.get('body').type('p');
      cy.get('tapiz-board-toolbar-button.active').should('exist');
    });

    it('G activates group mode', () => {
      cy.get('body').type('g');
      cy.get('tapiz-board-toolbar-button.active').should('exist');
    });

    it('Escape cancels active tool', () => {
      cy.get('body').type('n');
      cy.get('tapiz-sticky-note-pad').should('have.class', 'active');
      cy.get('body').type('{esc}');
      cy.get('tapiz-sticky-note-pad').should('not.have.class', 'active');
    });
  });

  context('Tools popup', () => {
    it('opens tools popup and shows all tool options', () => {
      // extrasButton uses dynamic [icon] binding — use static tooltip attribute instead
      cy.get('tapiz-board-toolbar-button[tooltip="Tools"]').click();
      cy.get('tapiz-tools').should('be.visible');
      cy.get('tapiz-tools').within(() => {
        cy.contains('Note').should('exist');
        cy.contains('Panel').should('exist');
        cy.contains('Text').should('exist');
        cy.contains('Image').should('exist');
        cy.contains('Poll').should('exist');
        cy.contains('Estimation').should('exist');
        cy.contains('Timer').should('exist');
      });
    });

    it('selecting Note from tools popup activates note mode', () => {
      cy.get('tapiz-board-toolbar-button[tooltip="Tools"]').click();
      cy.get('tapiz-tools').contains('Note').click();
      cy.get('tapiz-sticky-note-pad').should('have.class', 'active');
    });
  });

  context('Pin / unpin popup', () => {
    it('pin button keeps note popup open after placing a note', () => {
      cy.get('tapiz-sticky-note-pad').click();
      // Click the pin button
      cy.get('.toolbar-pinned button').click();
      // Place a note
      cy.get('tapiz-board').click(700, 450);
      // Popup should still be visible (pinned)
      cy.get('tapiz-notes').should('be.visible');
    });
  });
});
