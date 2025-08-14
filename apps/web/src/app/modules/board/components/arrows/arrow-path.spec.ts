import { describe, expect, it } from 'vitest';
import type { Point } from '@tapiz/board-commons';
import {
  buildCurvedArrowBezier,
  buildVisibleCurvedArrowBezier,
  cubicPointAt,
} from './arrow-path';
import type { CubicBezier } from './arrow-path';

describe('arrow-path', () => {
  it('keeps the visible curved path on the same curve as the hit path', () => {
    const options = {
      arrowType: 'curved' as const,
      startTangent: { x: 0, y: 1 },
      endTangent: { x: 1, y: 0 },
      hasStartHead: false,
      hasEndHead: true,
      arrowHeadLineInset: 6 * (8 - 2.2),
    };
    const start = { x: 10, y: 10 };
    const end = { x: 210, y: 130 };

    const hitCurve = buildCurvedArrowBezier(start, end, options);
    const visibleCurve = buildVisibleCurvedArrowBezier(start, end, options);
    const visibleMidpoint = cubicPointAt(visibleCurve, 0.5);

    expect(distanceToCubic(visibleMidpoint, hitCurve)).toBeLessThan(0.5);
  });
});

function distanceToCubic(point: Point, curve: CubicBezier) {
  let distance = Number.POSITIVE_INFINITY;

  for (let index = 0; index <= 1000; index++) {
    const curvePoint = cubicPointAt(curve, index / 1000);
    distance = Math.min(
      distance,
      Math.hypot(point.x - curvePoint.x, point.y - curvePoint.y),
    );
  }

  return distance;
}
