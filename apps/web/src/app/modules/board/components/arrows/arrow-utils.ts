import {
  ArrowAttachment,
  ArrowHead,
  ArrowNode,
  isBoardTuNode,
  Point,
  TuNode,
} from '@tapiz/board-commons';
import { getNodeSize } from '../../../../shared/node-size';

export const ARROW_PADDING = 10;
const ATTACH_THRESHOLD = 24;

type AttachmentCandidate = {
  attachment?: ArrowAttachment;
  anchor: Point;
};

export interface ArrowGeometry {
  position: Point;
  start: Point;
  end: Point;
  width: number;
  height: number;
}

export interface ArrowCreationConfig {
  color: string | null;
  strokeStyle: NonNullable<ArrowNode['strokeStyle']>;
  arrowType: NonNullable<ArrowNode['arrowType']>;
  heads: ArrowHead[];
  layer: number;
}

export interface ArrowEndpoints {
  start: AttachmentCandidate;
  end: AttachmentCandidate;
}

function computeArrowGeometry(
  start: Point,
  end: Point,
  padding = ARROW_PADDING,
): ArrowGeometry {
  const minX = Math.min(start.x, end.x) - padding;
  const minY = Math.min(start.y, end.y) - padding;
  const maxX = Math.max(start.x, end.x) + padding;
  const maxY = Math.max(start.y, end.y) + padding;

  return {
    position: {
      x: minX,
      y: minY,
    },
    start: {
      x: start.x - minX,
      y: start.y - minY,
    },
    end: {
      x: end.x - minX,
      y: end.y - minY,
    },
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function buildArrowContent(
  config: ArrowCreationConfig,
  endpoints: ArrowEndpoints,
): ArrowNode {
  const { position, start, end, width, height } = computeArrowGeometry(
    endpoints.start.anchor,
    endpoints.end.anchor,
  );

  return {
    layer: config.layer,
    position,
    width,
    height,
    start,
    end,
    color: config.color ?? undefined,
    strokeStyle: config.strokeStyle,
    arrowType: config.arrowType,
    heads: endpointsHasCustomHeads(config.heads) ? config.heads : undefined,
    startAttachment: endpoints.start.attachment,
    endAttachment: endpoints.end.attachment,
  };
}

function endpointsHasCustomHeads(heads: ArrowHead[]) {
  if (!heads.length) {
    return false;
  }

  if (heads.length === 1 && heads[0] === 'end') {
    return false;
  }

  if (heads.length === 2) {
    const [a, b] = heads;
    return !(a === 'start' && b === 'end');
  }

  return true;
}

function isPointNearNode(
  point: Point,
  node: TuNode,
): AttachmentCandidate | null {
  if (!isBoardTuNode(node)) {
    return null;
  }

  const { width = 0, height = 0 } = getNodeSize(node);
  const position = node.content.position;
  const expanded = {
    left: position.x - ATTACH_THRESHOLD,
    right: position.x + width + ATTACH_THRESHOLD,
    top: position.y - ATTACH_THRESHOLD,
    bottom: position.y + height + ATTACH_THRESHOLD,
  };

  if (
    point.x < expanded.left ||
    point.x > expanded.right ||
    point.y < expanded.top ||
    point.y > expanded.bottom
  ) {
    return null;
  }

  const clamped = {
    x: clamp(point.x, position.x, position.x + width),
    y: clamp(point.y, position.y, position.y + height),
  };

  return {
    anchor: clamped,
    attachment: {
      nodeId: node.id,
      offset: {
        x: clamped.x - position.x,
        y: clamped.y - position.y,
      },
    },
  };
}

export function findAttachment(
  point: Point,
  nodes: TuNode[],
): AttachmentCandidate {
  for (const node of nodes) {
    const candidate = isPointNearNode(point, node);

    if (candidate) {
      return candidate;
    }
  }

  return {
    anchor: point,
  };
}

export function absoluteFromArrow(
  arrow: ArrowNode,
  which: 'start' | 'end',
): Point {
  const point = arrow[which];

  return {
    x: arrow.position.x + point.x,
    y: arrow.position.y + point.y,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
