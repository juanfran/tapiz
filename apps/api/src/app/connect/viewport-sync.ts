import type { TuNode } from '@tapiz/board-commons';

interface Viewport {
  center: { x: number; y: number };
  width: number;
  height: number;
  zoom: number;
}

interface Rect {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface SpatialMeta {
  nodeId: string;
  bounds: { topLeft: { x: number; y: number }; bottomRight: { x: number; y: number } };
  layer: number;
}

export interface ClassifiedNodes {
  hot: TuNode[];
  warm: TuNode[];
  coldIndex: SpatialMeta[];
}

function intersects(a: Rect, b: Rect): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/**
 * Huffman-tree-inspired spatial priority classification.
 * Nodes closer to viewport center get highest priority (shortest access path).
 *
 * Band 0 (Hot):  Inside viewport → full data, immediate
 * Band 1 (Warm): Within 1.5x viewport → full data, prefetched
 * Band 2 (Cold): Beyond 1.5x → spatial index only (id + bounds)
 */
export function classifyNodes(nodes: TuNode[], viewport: Viewport): ClassifiedNodes {
  const vHalfW = (viewport.width / viewport.zoom) / 2;
  const vHalfH = (viewport.height / viewport.zoom) / 2;

  const viewRect: Rect = {
    minX: viewport.center.x - vHalfW,
    maxX: viewport.center.x + vHalfW,
    minY: viewport.center.y - vHalfH,
    maxY: viewport.center.y + vHalfH,
  };

  const prefetchRect: Rect = {
    minX: viewport.center.x - vHalfW * 1.5,
    maxX: viewport.center.x + vHalfW * 1.5,
    minY: viewport.center.y - vHalfH * 1.5,
    maxY: viewport.center.y + vHalfH * 1.5,
  };

  const hot: TuNode[] = [];
  const warm: TuNode[] = [];
  const coldIndex: SpatialMeta[] = [];

  for (const node of nodes) {
    const c = node.content as Record<string, unknown> | undefined;
    const pos = c?.['position'] as { x: number; y: number } | undefined;

    if (!pos) {
      hot.push(node);
      continue;
    }

    const w = (c?.['width'] as number) || 300;
    const h = (c?.['height'] as number) || 300;

    const nodeBounds: Rect = {
      minX: pos.x,
      maxX: pos.x + w,
      minY: pos.y,
      maxY: pos.y + h,
    };

    if (intersects(nodeBounds, viewRect)) {
      hot.push(node);
    } else if (intersects(nodeBounds, prefetchRect)) {
      warm.push(node);
    } else {
      coldIndex.push({
        nodeId: node.id,
        bounds: {
          topLeft: { x: nodeBounds.minX, y: nodeBounds.minY },
          bottomRight: { x: nodeBounds.maxX, y: nodeBounds.maxY },
        },
        layer: (c?.['layer'] as number) ?? 0,
      });
    }
  }

  return { hot, warm, coldIndex };
}
