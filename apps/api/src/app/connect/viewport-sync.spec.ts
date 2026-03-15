import { describe, it, expect } from 'vitest';
import { classifyNodes } from './viewport-sync.js';
import type { TuNode } from '@tapiz/board-commons';

function makeNode(
  id: string,
  x: number,
  y: number,
  w = 200,
  h = 200,
): TuNode {
  return {
    id,
    type: 'note',
    content: { position: { x, y }, width: w, height: h, layer: 1 },
  };
}

const viewport = {
  center: { x: 500, y: 500 },
  width: 1920,
  height: 1080,
  zoom: 1,
};

describe('classifyNodes', () => {
  it('klassifiziert sichtbare Nodes als hot', () => {
    const nodes = [makeNode('visible', 400, 400)];
    const { hot, warm, coldIndex } = classifyNodes(nodes, viewport);

    expect(hot).toHaveLength(1);
    expect(hot[0].id).toBe('visible');
    expect(warm).toHaveLength(0);
    expect(coldIndex).toHaveLength(0);
  });

  it('klassifiziert Prefetch-Nodes als warm', () => {
    const nodes = [makeNode('prefetch', -900, 500)];
    const { hot, warm, coldIndex } = classifyNodes(nodes, viewport);

    expect(hot).toHaveLength(0);
    expect(warm).toHaveLength(1);
    expect(warm[0].id).toBe('prefetch');
    expect(coldIndex).toHaveLength(0);
  });

  it('klassifiziert weit entfernte Nodes als cold', () => {
    const nodes = [makeNode('far', 5000, 5000)];
    const { hot, warm, coldIndex } = classifyNodes(nodes, viewport);

    expect(hot).toHaveLength(0);
    expect(warm).toHaveLength(0);
    expect(coldIndex).toHaveLength(1);
    expect(coldIndex[0].nodeId).toBe('far');
  });

  it('setzt Nodes ohne Position als hot (Fallback)', () => {
    const node: TuNode = { id: 'nopos', type: 'settings', content: {} };
    const { hot } = classifyNodes([node], viewport);

    expect(hot).toHaveLength(1);
    expect(hot[0].id).toBe('nopos');
  });

  it('berücksichtigt Zoom bei der Klassifizierung', () => {
    const nodes = [makeNode('zoomed', 1500, 500)];

    const zoomedOut = classifyNodes(nodes, { ...viewport, zoom: 0.5 });
    expect(zoomedOut.hot).toHaveLength(1);

    const zoomedIn = classifyNodes(nodes, { ...viewport, zoom: 2 });
    expect(zoomedIn.hot).toHaveLength(0);
  });

  it('klassifiziert 500 Nodes korrekt und schnell', () => {
    const nodes = Array.from({ length: 500 }, (_, i) =>
      makeNode(`n${i}`, (i % 50) * 200, Math.floor(i / 50) * 200),
    );

    const start = performance.now();
    const { hot, warm, coldIndex } = classifyNodes(nodes, viewport);
    const elapsed = performance.now() - start;

    expect(hot.length + warm.length + coldIndex.length).toBe(500);
    expect(elapsed).toBeLessThan(10);
  });

  it('cold-Index enthält korrekte Bounds', () => {
    const nodes = [makeNode('cold', 3000, 3000, 150, 100)];
    const { coldIndex } = classifyNodes(nodes, viewport);

    expect(coldIndex[0].bounds).toEqual({
      topLeft: { x: 3000, y: 3000 },
      bottomRight: { x: 3150, y: 3100 },
    });
    expect(coldIndex[0].layer).toBe(1);
  });
});
