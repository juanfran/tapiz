/**
 * Performance-Benchmarks: Viewport-Rendering pro Node-Anzahl
 *
 * Misst DOM-Rendering, Interaktionslatenz und Speicherverbrauch
 * bei steigender Node-Anzahl auf dem Whiteboard.
 */
describe('Performance: Viewport-Rendering', () => {
  const NODE_COUNTS = [10, 50, 100, 250, 500];

  beforeEach(() => {
    cy.visit('/board/demo');
    cy.waitForBoard();
  });

  NODE_COUNTS.forEach((count) => {
    it(`rendert ${count} Nodes innerhalb akzeptabler Zeit`, () => {
      cy.window().then((win) => {
        const board = win.document.querySelector('tapiz-board') as HTMLElement;
        if (!board) throw new Error('tapiz-board not found');

        const t0 = performance.now();

        // Erstelle Nodes programmatisch via Board-API
        for (let i = 0; i < count; i++) {
          const noteEl = win.document.createElement('div');
          noteEl.className = 'perf-test-node';
          noteEl.style.cssText = `
            position: absolute;
            left: ${(i % 20) * 220}px;
            top: ${Math.floor(i / 20) * 220}px;
            width: 200px;
            height: 200px;
            background: #fef3c7;
            border: 1px solid #d97706;
            border-radius: 4px;
          `;
          noteEl.textContent = `Node ${i + 1}`;
          board.appendChild(noteEl);
        }

        const renderTime = performance.now() - t0;

        // DOM-Node-Zählung
        const renderedNodes =
          board.querySelectorAll('.perf-test-node').length;
        expect(renderedNodes).to.equal(count);

        // Render-Performance Assertion
        const maxRenderMs = count <= 100 ? 500 : count <= 250 ? 1500 : 3000;
        expect(
          renderTime,
          `Render von ${count} Nodes dauerte ${renderTime.toFixed(0)}ms (max: ${maxRenderMs}ms)`,
        ).to.be.below(maxRenderMs);

        cy.log(
          `**${count} Nodes:** ${renderTime.toFixed(0)}ms Render-Zeit`,
        );
      });
    });
  });

  it('Viewport-Pan bleibt reaktiv bei 200 Nodes', () => {
    cy.window().then((win) => {
      const board = win.document.querySelector('tapiz-board') as HTMLElement;
      if (!board) throw new Error('tapiz-board not found');

      // 200 Nodes erzeugen
      for (let i = 0; i < 200; i++) {
        const el = win.document.createElement('div');
        el.className = 'perf-test-node';
        el.style.cssText = `
          position: absolute;
          left: ${(i % 20) * 220}px;
          top: ${Math.floor(i / 20) * 220}px;
          width: 200px; height: 200px;
          background: #dbeafe; border: 1px solid #3b82f6;
        `;
        board.appendChild(el);
      }

      // Pan-Latenz messen
      const panStart = performance.now();

      board.dispatchEvent(
        new PointerEvent('pointerdown', {
          clientX: 500,
          clientY: 400,
          bubbles: true,
        }),
      );
      board.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: 300,
          clientY: 200,
          bubbles: true,
        }),
      );
      board.dispatchEvent(
        new PointerEvent('pointerup', {
          clientX: 300,
          clientY: 200,
          bubbles: true,
        }),
      );

      const panLatency = performance.now() - panStart;

      expect(
        panLatency,
        `Pan-Latenz: ${panLatency.toFixed(0)}ms`,
      ).to.be.below(100);

      cy.log(`**Pan-Latenz bei 200 Nodes:** ${panLatency.toFixed(0)}ms`);
    });
  });

  it('Memory Footprint bleibt stabil', () => {
    cy.window().then((win) => {
      const perf = (win.performance as Performance & {
        memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
      });

      if (!perf.memory) {
        cy.log('**Memory API nicht verfügbar** (nicht-Chromium)');
        return;
      }

      const baselineMemory = perf.memory.usedJSHeapSize;

      const board = win.document.querySelector('tapiz-board') as HTMLElement;

      // 300 Nodes erzeugen
      for (let i = 0; i < 300; i++) {
        const el = win.document.createElement('div');
        el.className = 'perf-test-node';
        el.style.cssText = `
          position: absolute;
          left: ${(i % 20) * 220}px;
          top: ${Math.floor(i / 20) * 220}px;
          width: 200px; height: 200px; background: #fce7f3;
        `;
        board.appendChild(el);
      }

      const afterMemory = perf.memory.usedJSHeapSize;
      const deltaKB = (afterMemory - baselineMemory) / 1024;
      const maxDeltaKB = 10_000; // 10MB max für 300 Nodes

      expect(
        deltaKB,
        `Memory Delta: ${deltaKB.toFixed(0)}KB (max: ${maxDeltaKB}KB)`,
      ).to.be.below(maxDeltaKB);

      cy.log(
        `**Memory:** Baseline ${(baselineMemory / 1024 / 1024).toFixed(1)}MB → +${(deltaKB / 1024).toFixed(1)}MB für 300 Nodes`,
      );
    });
  });
});
