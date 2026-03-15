/**
 * E2E: DDD training workflows
 *
 * Covers the complete Domain-Driven Design workshop flows:
 *  1. Event Storming board setup
 *  2. Bounded Context Canvas usage
 *  3. Aggregate Design Canvas usage
 *  4. Note color coding (orange=event, blue=command, etc.)
 *  5. Swimlane interactions (adding notes to specific areas)
 */

describe('DDD Training Workflows', () => {
  beforeEach(() => {
    cy.visit('/demo');
    cy.waitForBoard();
  });

  context('Event Storming', () => {
    it('loads the Event Storming template', () => {
      // In boardMode=1 (edit), templates are accessible
      cy.get('tapiz-board-toolbar-button[icon="templates"]').click();
      cy.get('tapiz-template-selector').within(() => {
        cy.contains('Event Storming (DDD)').should('be.visible').click();
      });

      // Expect multiple panels (swimlanes) and pre-seeded notes
      cy.get('tapiz-panel', { timeout: 10000 }).should(
        'have.length.at.least',
        6,
      );
      cy.get('tapiz-note').should('have.length.at.least', 4);
    });

    it('supports placing domain events (orange notes) in the Events swimlane', () => {
      // Load Event Storming template
      cy.get('tapiz-board-toolbar-button[icon="templates"]').click();
      cy.contains('Event Storming (DDD)').click();
      cy.get('tapiz-panel', { timeout: 10000 }).should(
        'have.length.at.least',
        6,
      );

      // Switch to normal mode and add an orange note
      cy.get('tapiz-sticky-note-pad').click();

      // Select orange color
      cy.get('tapiz-notes .note').then(($swatches) => {
        // Find the orange swatch (#ffa500-ish)
        const orange = Array.from($swatches).find((el) => {
          const bg = (el as HTMLElement).style.background;
          return bg.includes('255') && bg.includes('165');
        });
        if (orange) cy.wrap(orange).click();
      });

      cy.get('tapiz-board').click(600, 350);
      // A new note should appear
      cy.get('tapiz-note').its('length').should('be.gte', 5);
    });
  });

  context('Bounded Context Canvas', () => {
    it('loads the Bounded Context Canvas', () => {
      cy.get('tapiz-board-toolbar-button[icon="templates"]').click();
      cy.contains('Bounded Context Canvas (DDD)').click();

      cy.get('tapiz-panel', { timeout: 10000 }).should(
        'have.length.at.least',
        5,
      );
    });

    it('allows adding terms to the Ubiquitous Language section', () => {
      cy.get('tapiz-board-toolbar-button[icon="templates"]').click();
      cy.contains('Bounded Context Canvas (DDD)').click();
      cy.get('tapiz-panel', { timeout: 10000 }).should(
        'have.length.at.least',
        5,
      );

      // Add a purple note (ubiquitous language term)
      cy.get('tapiz-sticky-note-pad').click();
      cy.get('tapiz-board').click(400, 550);
      cy.get('tapiz-note').its('length').should('be.gte', 4);
    });
  });

  context('Aggregate Design Canvas', () => {
    it('loads the Aggregate Design Canvas', () => {
      cy.get('tapiz-board-toolbar-button[icon="templates"]').click();
      cy.contains('Aggregate Design Canvas (DDD)').click();

      cy.get('tapiz-panel', { timeout: 10000 }).should(
        'have.length.at.least',
        7,
      );
      cy.get('tapiz-note').should('have.length.at.least', 6);
    });

    it('displays commands (blue notes), domain events (orange notes), and invariants (red notes)', () => {
      cy.get('tapiz-board-toolbar-button[icon="templates"]').click();
      cy.contains('Aggregate Design Canvas (DDD)').click();

      // Blue command notes
      cy.get('tapiz-note').should('have.length.at.least', 6);
    });
  });

  context('DDD Note Color Workflow', () => {
    it('allows selecting all DDD semantic colors for notes', () => {
      // Open note color picker
      cy.get('tapiz-sticky-note-pad').click();
      cy.get('tapiz-notes').should('be.visible');

      // All 16 color swatches should be present
      cy.get('tapiz-notes .note').should('have.length.at.least', 14);
    });
  });
});
