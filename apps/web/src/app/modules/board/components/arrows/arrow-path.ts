import { ArrowNode, Point } from '@tapiz/board-commons';

type ArrowType = NonNullable<ArrowNode['arrowType']>;
type Endpoint = 'start' | 'end';

export interface ArrowPathOptions {
  arrowType: ArrowType;
  startTangent: Point | null;
  endTangent: Point | null;
  hasStartHead: boolean;
  hasEndHead: boolean;
  arrowHeadLineInset: number;
}

export interface CubicBezier {
  start: Point;
  control1: Point;
  control2: Point;
  end: Point;
}

export function buildArrowPath(
  start: Point,
  end: Point,
  options: ArrowPathOptions,
) {
  if (start.x === end.x && start.y === end.y) {
    return `M ${start.x} ${start.y} l 0.01 0`;
  }

  switch (options.arrowType) {
    case 'curved':
      return cubicBezierPath(buildCurvedArrowBezier(start, end, options));
    case 'elbow':
      return buildElbowPath(start, end);
    case 'sharp':
    default:
      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }
}

export function buildVisibleArrowPath(
  start: Point,
  end: Point,
  options: ArrowPathOptions,
) {
  if (options.arrowType === 'curved') {
    return cubicBezierPath(buildVisibleCurvedArrowBezier(start, end, options));
  }

  return buildArrowPath(
    visibleEndpoint(start, end, 'start', options),
    visibleEndpoint(start, end, 'end', options),
    options,
  );
}

export function buildCurvedArrowBezier(
  start: Point,
  end: Point,
  options: ArrowPathOptions,
): CubicBezier {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  const controlDistance = Math.min(Math.max(distance * 0.35, 24), 180);
  const startTangent = endpointTangent('start', start, end, options);
  const endTangent = endpointTangent('end', start, end, options);

  return {
    start,
    control1: {
      x: start.x + startTangent.x * controlDistance,
      y: start.y + startTangent.y * controlDistance,
    },
    control2: {
      x: end.x - endTangent.x * controlDistance,
      y: end.y - endTangent.y * controlDistance,
    },
    end,
  };
}

export function buildVisibleCurvedArrowBezier(
  start: Point,
  end: Point,
  options: ArrowPathOptions,
): CubicBezier {
  const curve = buildCurvedArrowBezier(start, end, options);
  const length = cubicBezierLength(curve);
  const inset = Math.min(options.arrowHeadLineInset, Math.max(0, length / 2));
  const startDistance = options.hasStartHead ? inset : 0;
  const endDistance = options.hasEndHead ? length - inset : length;

  if (startDistance <= 0 && endDistance >= length) {
    return curve;
  }

  return trimCubicBezier(
    curve,
    cubicTAtLength(curve, startDistance),
    cubicTAtLength(curve, endDistance),
  );
}

export function cubicPointAt(curve: CubicBezier, t: number): Point {
  const mt = 1 - t;

  return {
    x:
      mt ** 3 * curve.start.x +
      3 * mt ** 2 * t * curve.control1.x +
      3 * mt * t ** 2 * curve.control2.x +
      t ** 3 * curve.end.x,
    y:
      mt ** 3 * curve.start.y +
      3 * mt ** 2 * t * curve.control1.y +
      3 * mt * t ** 2 * curve.control2.y +
      t ** 3 * curve.end.y,
  };
}

function trimCubicBezier(
  curve: CubicBezier,
  startT: number,
  endT: number,
): CubicBezier {
  if (startT <= 0 && endT >= 1) {
    return curve;
  }

  const [, right] = splitCubicBezier(curve, startT);
  const remaining = 1 - startT;

  if (remaining <= 0) {
    return {
      start: curve.end,
      control1: curve.end,
      control2: curve.end,
      end: curve.end,
    };
  }

  return splitCubicBezier(right, (endT - startT) / remaining)[0];
}

function splitCubicBezier(
  curve: CubicBezier,
  t: number,
): [CubicBezier, CubicBezier] {
  const clampedT = clamp(t, 0, 1);
  const p01 = lerpPoint(curve.start, curve.control1, clampedT);
  const p12 = lerpPoint(curve.control1, curve.control2, clampedT);
  const p23 = lerpPoint(curve.control2, curve.end, clampedT);
  const p012 = lerpPoint(p01, p12, clampedT);
  const p123 = lerpPoint(p12, p23, clampedT);
  const p0123 = lerpPoint(p012, p123, clampedT);

  return [
    {
      start: curve.start,
      control1: p01,
      control2: p012,
      end: p0123,
    },
    {
      start: p0123,
      control1: p123,
      control2: p23,
      end: curve.end,
    },
  ];
}

function visibleEndpoint(
  start: Point,
  end: Point,
  endpoint: Endpoint,
  options: ArrowPathOptions,
) {
  const tangent = endpointTangent(endpoint, start, end, options);
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const inset = Math.min(options.arrowHeadLineInset, Math.max(0, distance / 2));

  if (endpoint === 'start') {
    return {
      x: start.x + (options.hasStartHead ? tangent.x * inset : 0),
      y: start.y + (options.hasStartHead ? tangent.y * inset : 0),
    };
  }

  return {
    x: end.x - (options.hasEndHead ? tangent.x * inset : 0),
    y: end.y - (options.hasEndHead ? tangent.y * inset : 0),
  };
}

function endpointTangent(
  endpoint: Endpoint,
  start: Point,
  end: Point,
  options: ArrowPathOptions,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (options.arrowType === 'curved') {
    const tangent =
      endpoint === 'start' ? options.startTangent : options.endTangent;

    if (tangent) {
      return unit(tangent.x, tangent.y);
    }

    if (dx !== 0) {
      return unit(dx, 0);
    }
  }

  if (options.arrowType === 'elbow') {
    const useHV = Math.abs(dx) >= Math.abs(dy);

    if (endpoint === 'start') {
      return useHV ? unit(dx, 0) : unit(0, dy);
    }

    return useHV ? unit(0, dy) : unit(dx, 0);
  }

  return unit(dx, dy);
}

function buildElbowPath(start: Point, end: Point) {
  const useHV = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);

  if (useHV) {
    return `M ${start.x} ${start.y} L ${end.x} ${start.y} L ${end.x} ${end.y}`;
  }

  return `M ${start.x} ${start.y} L ${start.x} ${end.y} L ${end.x} ${end.y}`;
}

function cubicBezierPath(curve: CubicBezier) {
  return `M ${curve.start.x} ${curve.start.y} C ${curve.control1.x} ${curve.control1.y}, ${curve.control2.x} ${curve.control2.y}, ${curve.end.x} ${curve.end.y}`;
}

function cubicBezierLength(curve: CubicBezier, samples = 40) {
  let previous = curve.start;
  let length = 0;

  for (let index = 1; index <= samples; index++) {
    const point = cubicPointAt(curve, index / samples);
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }

  return length;
}

function cubicTAtLength(curve: CubicBezier, targetLength: number) {
  const samples = 80;
  let previous = curve.start;
  let length = 0;

  for (let index = 1; index <= samples; index++) {
    const t = index / samples;
    const point = cubicPointAt(curve, t);
    const segmentLength = Math.hypot(
      point.x - previous.x,
      point.y - previous.y,
    );

    if (length + segmentLength >= targetLength) {
      const segmentRatio = segmentLength
        ? (targetLength - length) / segmentLength
        : 0;

      return (index - 1 + segmentRatio) / samples;
    }

    length += segmentLength;
    previous = point;
  }

  return 1;
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function unit(x: number, y: number) {
  const length = Math.hypot(x, y);

  if (!length) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / length,
    y: y / length,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
