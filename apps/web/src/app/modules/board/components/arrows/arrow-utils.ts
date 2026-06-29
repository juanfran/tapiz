import {
  ArrowAttachment,
  ArrowHead,
  ArrowNode,
  ArrowStrokeWidth,
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
  strokeWidth: ArrowStrokeWidth;
  arrowType: NonNullable<ArrowNode['arrowType']>;
  heads: ArrowHead[];
  layer: ArrowNode['layer'];
}

export interface ArrowEndpoints {
  start: AttachmentCandidate;
  end: AttachmentCandidate;
}

export interface ArrowEndpointTangents {
  start: Point | null;
  end: Point | null;
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

export function resolveArrowContent(
  arrow: ArrowNode,
  nodes: TuNode[],
): ArrowNode {
  const start = resolveEndpoint(arrow, 'start', nodes);
  const end = resolveEndpoint(arrow, 'end', nodes);
  const {
    position,
    width,
    height,
    start: localStart,
    end: localEnd,
  } = computeArrowGeometry(start, end);

  return {
    ...arrow,
    position,
    width,
    height,
    start: localStart,
    end: localEnd,
  };
}

export function resolveArrowEndpointTangents(
  arrow: ArrowNode,
  nodes: TuNode[],
): ArrowEndpointTangents {
  const start = absoluteFromArrow(arrow, 'start');
  const end = absoluteFromArrow(arrow, 'end');

  return {
    start: resolveAttachmentTangent(
      arrow.startAttachment,
      nodes,
      start,
      end,
      'start',
    ),
    end: resolveAttachmentTangent(
      arrow.endAttachment,
      nodes,
      end,
      start,
      'end',
    ),
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
    strokeWidth: config.strokeWidth,
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
  const rotation = rotationRadians(node);
  const localPoint = toLocalPoint(point, position, rotation);
  const expanded = {
    left: -ATTACH_THRESHOLD,
    right: width + ATTACH_THRESHOLD,
    top: -ATTACH_THRESHOLD,
    bottom: height + ATTACH_THRESHOLD,
  };

  if (
    localPoint.x < expanded.left ||
    localPoint.x > expanded.right ||
    localPoint.y < expanded.top ||
    localPoint.y > expanded.bottom
  ) {
    return null;
  }

  if (node.type === 'panel' && isInsideLocalRect(localPoint, width, height)) {
    const distanceToBorder = Math.min(
      localPoint.x,
      width - localPoint.x,
      localPoint.y,
      height - localPoint.y,
    );

    if (distanceToBorder > ATTACH_THRESHOLD) {
      return null;
    }
  }

  const localAnchor = closestPointOnLocalRectBorder(localPoint, width, height);

  return {
    anchor: toWorldPoint(localAnchor, position, rotation),
    attachment: {
      nodeId: node.id,
      offset: localAnchor,
    },
  };
}

export function findAttachment(
  point: Point,
  nodes: TuNode[],
): AttachmentCandidate {
  const panelCandidates: AttachmentCandidate[] = [];

  for (const node of nodes) {
    const candidate = isPointNearNode(point, node);

    if (!candidate) {
      continue;
    }

    if (node.type === 'panel') {
      panelCandidates.push(candidate);
    } else {
      return candidate;
    }
  }

  if (panelCandidates.length) {
    return panelCandidates[0];
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

function resolveEndpoint(
  arrow: ArrowNode,
  which: 'start' | 'end',
  nodes: TuNode[],
): Point {
  const attachment =
    which === 'start' ? arrow.startAttachment : arrow.endAttachment;
  const attached = resolveAttachment(attachment, nodes);

  return attached ?? absoluteFromArrow(arrow, which);
}

function resolveAttachmentTangent(
  attachment: ArrowAttachment | undefined,
  nodes: TuNode[],
  endpoint: Point,
  otherEndpoint: Point,
  endpointType: 'start' | 'end',
): Point | null {
  if (!attachment) {
    return null;
  }

  const node = nodes.find((item) => item.id === attachment.nodeId);

  if (!node || !isBoardTuNode(node)) {
    return null;
  }

  const { width = 0, height = 0 } = getNodeSize(node);
  const position = node.content.position;
  const rotation = rotationRadians(node);
  const localEndpoint = toLocalPoint(endpoint, position, rotation);
  const localOtherEndpoint = toLocalPoint(otherEndpoint, position, rotation);
  const outward = resolveAttachmentOutwardDirection(attachment, width, height, {
    x: localOtherEndpoint.x - localEndpoint.x,
    y: localOtherEndpoint.y - localEndpoint.y,
  });

  if (!outward) {
    return null;
  }

  const worldOutward = rotateVector(outward, rotation);

  if (endpointType === 'start') {
    return worldOutward;
  }

  return {
    x: -worldOutward.x,
    y: -worldOutward.y,
  };
}

function resolveAttachmentOutwardDirection(
  attachment: ArrowAttachment,
  width: number,
  height: number,
  towardOtherEndpoint: Point,
): Point | null {
  const offset = attachment.offset;
  const distances = [
    { distance: offset.x, direction: { x: -1, y: 0 } },
    { distance: width - offset.x, direction: { x: 1, y: 0 } },
    { distance: offset.y, direction: { x: 0, y: -1 } },
    { distance: height - offset.y, direction: { x: 0, y: 1 } },
  ];
  const minDistance = Math.min(...distances.map((item) => item.distance));
  const edgeTolerance = 0.5;
  const candidates = distances.filter((item) => {
    return item.distance <= minDistance + edgeTolerance;
  });

  if (!candidates.length) {
    return null;
  }

  return candidates.toSorted((a, b) => {
    return (
      dot(b.direction, towardOtherEndpoint) -
      dot(a.direction, towardOtherEndpoint)
    );
  })[0].direction;
}

function resolveAttachment(
  attachment: ArrowAttachment | undefined,
  nodes: TuNode[],
): Point | null {
  if (!attachment) {
    return null;
  }

  const node = nodes.find((item) => item.id === attachment.nodeId);

  if (!node || !isBoardTuNode(node)) {
    return null;
  }

  const { width = 0, height = 0 } = getNodeSize(node);
  const position = node.content.position;
  const rotation = rotationRadians(node);

  return toWorldPoint(
    {
      x: clamp(attachment.offset.x, 0, width),
      y: clamp(attachment.offset.y, 0, height),
    },
    position,
    rotation,
  );
}

function closestPointOnLocalRectBorder(
  point: Point,
  width: number,
  height: number,
) {
  const left = 0;
  const right = width;
  const top = 0;
  const bottom = height;
  const x = clamp(point.x, left, right);
  const y = clamp(point.y, top, bottom);
  const inside =
    point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;

  if (!inside) {
    return { x, y };
  }

  const distances = [
    { distance: Math.abs(point.x - left), point: { x: left, y } },
    { distance: Math.abs(right - point.x), point: { x: right, y } },
    { distance: Math.abs(point.y - top), point: { x, y: top } },
    { distance: Math.abs(bottom - point.y), point: { x, y: bottom } },
  ];

  return distances.toSorted((a, b) => a.distance - b.distance)[0].point;
}

function isInsideLocalRect(point: Point, width: number, height: number) {
  return point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height;
}

function rotationRadians(node: TuNode<{ rotation?: number }>) {
  return ((node.content.rotation ?? 0) * Math.PI) / 180;
}

function toLocalPoint(point: Point, origin: Point, rotation: number): Point {
  return rotateVector(
    {
      x: point.x - origin.x,
      y: point.y - origin.y,
    },
    -rotation,
  );
}

function toWorldPoint(point: Point, origin: Point, rotation: number): Point {
  const rotated = rotateVector(point, rotation);

  return {
    x: origin.x + rotated.x,
    y: origin.y + rotated.y,
  };
}

function rotateVector(point: Point, rotation: number): Point {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

function dot(a: Point, b: Point) {
  return a.x * b.x + a.y * b.y;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
