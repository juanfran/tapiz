import type { Point } from '@tapiz/board-commons';

export type ViewportSize = {
  width: number;
  height: number;
};

export type PingArrow = {
  position: Point;
  rotation: number;
};

export function projectBoardPointToViewport(
  point: Point,
  boardPosition: Point,
  zoom: number,
): Point {
  return {
    x: boardPosition.x + point.x * zoom,
    y: boardPosition.y + point.y * zoom,
  };
}

export function getPingArrow(
  target: Point,
  viewport: ViewportSize,
  options: {
    edgeInset: number;
    pingSize: number;
  },
): PingArrow | null {
  const isVisible =
    target.x >= options.pingSize / 2 &&
    target.x <= viewport.width - options.pingSize / 2 &&
    target.y >= options.pingSize / 2 &&
    target.y <= viewport.height - options.pingSize / 2;

  if (isVisible) {
    return null;
  }

  const center = {
    x: viewport.width / 2,
    y: viewport.height / 2,
  };
  const delta = {
    x: target.x - center.x,
    y: target.y - center.y,
  };
  const minX = options.edgeInset;
  const maxX = viewport.width - options.edgeInset;
  const minY = options.edgeInset;
  const maxY = viewport.height - options.edgeInset;
  const scaleX =
    delta.x === 0
      ? Number.POSITIVE_INFINITY
      : (delta.x > 0 ? maxX - center.x : minX - center.x) / delta.x;
  const scaleY =
    delta.y === 0
      ? Number.POSITIVE_INFINITY
      : (delta.y > 0 ? maxY - center.y : minY - center.y) / delta.y;
  const scale = Math.min(Math.abs(scaleX), Math.abs(scaleY));

  return {
    position: {
      x: center.x + delta.x * scale,
      y: center.y + delta.y * scale,
    },
    rotation: Math.atan2(delta.y, delta.x),
  };
}
