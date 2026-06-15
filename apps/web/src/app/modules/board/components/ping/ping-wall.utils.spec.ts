import { describe, expect, it } from 'vitest';
import { getPingArrow, projectBoardPointToViewport } from './ping-wall.utils';

const arrowOptions = {
  edgeInset: 160,
  pingSize: 200,
};

describe('ping-wall utils', () => {
  it('projects board coordinates to the current viewport coordinates', () => {
    expect(
      projectBoardPointToViewport({ x: 100, y: 50 }, { x: -40, y: 20 }, 1.5),
    ).toEqual({
      x: 110,
      y: 95,
    });
  });

  it('does not show an arrow when the ping is visible', () => {
    expect(
      getPingArrow(
        { x: 400, y: 300 },
        { width: 800, height: 600 },
        arrowOptions,
      ),
    ).toBeNull();
  });

  it('places the arrow on the right edge when the ping is offscreen right', () => {
    const arrow = getPingArrow(
      { x: 1200, y: 300 },
      { width: 800, height: 600 },
      arrowOptions,
    );

    expect(arrow?.position).toEqual({ x: 640, y: 300 });
    expect(arrow?.rotation).toBe(0);
  });

  it('places the arrow on the top edge when the ping is above the viewport', () => {
    const arrow = getPingArrow(
      { x: 400, y: -500 },
      { width: 800, height: 600 },
      arrowOptions,
    );

    expect(arrow?.position.x).toBeCloseTo(400);
    expect(arrow?.position.y).toBeCloseTo(160);
    expect(arrow?.rotation).toBeCloseTo(-Math.PI / 2);
  });
});
