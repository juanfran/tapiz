/**
 * Smoke test: toolbar is reachable and not covered by any overlay
 * (validates that the demo-intro backdrop is suppressed in test runs)
 */
describe('Board smoke: toolbar accessibility', () => {
  beforeEach(() => {
    cy.visit('/board/demo');
    cy.waitForBoard();
  });

  it('toolbar is not covered by any overlay', () => {
    cy.window().then((win) => {
      const toolbar = win.document.querySelector(
        'tapiz-board-toolbar',
      ) as HTMLElement;
      if (!toolbar) throw new Error('tapiz-board-toolbar not found');

      const rect = toolbar.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy2 = rect.top + 20;

      const top = win.document.elementFromPoint(cx, cy2);

      // Top element must be inside the toolbar, not an overlay (e.g. cdk-overlay-backdrop)
      const isInsideToolbar = toolbar.contains(top) || top === toolbar;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(
        isInsideToolbar,
        `Expected toolbar to be on top but got: ${top?.tagName}.${(top as HTMLElement)?.className?.substring(0, 40)}`,
      ).to.be.true;
    });
  });
});
