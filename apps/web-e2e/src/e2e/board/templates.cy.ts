/**
 * E2E: Template selector workflows
 *
 * Covers:
 *  1. Opening the template selector
 *  2. Classic retrospective templates (Stop/Start/Continue, Sailboat, etc.)
 *  3. DDD templates (Event Storming, Bounded Context Canvas, Aggregate Design Canvas)
 *  4. Template nodes appear on the board after selection
 */

describe('Template Selector', () => {
  beforeEach(() => {
    cy.visit('/board/demo');
    cy.waitForBoard();
    // Templates are only accessible in boardMode=1 (edit mode)
    cy.get('.change-edit', { timeout: 5000 }).click();
    cy.get('tapiz-board-toolbar-button[icon="templates"]', {
      timeout: 5000,
    }).should('exist');
  });

  it('opens template selector from toolbar', () => {
    cy.get('tapiz-board-toolbar-button[icon="templates"]')
      .should('be.visible')
      .click();
    cy.get('tapiz-template-selector').should('be.visible');
  });

  it('shows all expected templates including DDD templates', () => {
    cy.get('tapiz-board-toolbar-button[icon="templates"]').click();
    cy.get('tapiz-template-selector').within(() => {
      cy.contains('Stop, Start, Continue').should('exist');
      cy.contains('Sailboat').should('exist');
      cy.contains('Mad, Sad, Glad').should('exist');
      cy.contains('Starfish').should('exist');
      cy.contains('Event Storming (DDD)').should('exist');
      cy.contains('Bounded Context Canvas (DDD)').should('exist');
      cy.contains('Aggregate Design Canvas (DDD)').should('exist');
    });
  });

  it('loads Event Storming template onto the board', () => {
    cy.get('tapiz-board-toolbar-button[icon="templates"]').click();
    cy.get('tapiz-template-selector').within(() => {
      cy.contains('Event Storming (DDD)').click();
    });

    // The template creates multiple nodes — panels and notes
    cy.get('tapiz-node', { timeout: 10000 }).should('have.length.at.least', 8);
    // At least one orange (domain event) note should be present
    cy.get('tapiz-note').should('have.length.at.least', 1);
  });

  it('loads Bounded Context Canvas template onto the board', () => {
    cy.get('tapiz-board-toolbar-button[icon="templates"]').click();
    cy.get('tapiz-template-selector').within(() => {
      cy.contains('Bounded Context Canvas (DDD)').click();
    });

    cy.get('tapiz-node', { timeout: 10000 }).should('have.length.at.least', 6);
    cy.get('tapiz-panel').should('have.length.at.least', 4);
  });

  it('loads Aggregate Design Canvas template onto the board', () => {
    cy.get('tapiz-board-toolbar-button[icon="templates"]').click();
    cy.get('tapiz-template-selector').within(() => {
      // scrollIntoView in case the item is partially off-screen in the list
      cy.contains('Aggregate Design Canvas (DDD)')
        .scrollIntoView()
        .click({ force: true });
    });

    cy.get('tapiz-node', { timeout: 10000 }).should('have.length.at.least', 8);
    cy.get('tapiz-panel').should('have.length.at.least', 3);
  });

  it('loads Stop/Start/Continue template', () => {
    cy.get('tapiz-board-toolbar-button[icon="templates"]').click();
    cy.get('tapiz-template-selector').within(() => {
      cy.contains('Stop, Start, Continue').click();
    });

    cy.get('tapiz-node', { timeout: 10000 }).should('have.length.at.least', 4);
  });

  it('closes template selector with Escape', () => {
    cy.get('tapiz-board-toolbar-button[icon="templates"]').click();
    cy.get('tapiz-template-selector').should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('tapiz-template-selector').should('not.exist');
  });
});
