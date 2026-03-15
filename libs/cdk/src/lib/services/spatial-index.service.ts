import { Injectable } from '@angular/core';
import RBush from 'rbush';

interface SpatialItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: string;
}

/**
 * R-tree spatial index for O(log n) viewport-based node queries.
 * Wraps rbush for efficient 2D rectangle intersection queries.
 */
@Injectable({ providedIn: 'root' })
export class SpatialIndexService {
  #tree = new RBush<SpatialItem>();
  #items = new Map<string, SpatialItem>();

  /**
   * Bulk-load all nodes into the index (fastest for initial load).
   */
  bulkLoad(nodes: { id: string; x: number; y: number; w: number; h: number }[]) {
    this.#tree.clear();
    this.#items.clear();

    const items: SpatialItem[] = nodes.map((n) => {
      const item: SpatialItem = {
        minX: n.x,
        minY: n.y,
        maxX: n.x + n.w,
        maxY: n.y + n.h,
        id: n.id,
      };
      this.#items.set(n.id, item);
      return item;
    });

    this.#tree.load(items);
  }

  /**
   * Insert or update a single node.
   */
  upsert(id: string, x: number, y: number, w: number, h: number) {
    const existing = this.#items.get(id);
    if (existing) {
      this.#tree.remove(existing, (a, b) => a.id === b.id);
    }

    const item: SpatialItem = {
      minX: x,
      minY: y,
      maxX: x + w,
      maxY: y + h,
      id,
    };

    this.#items.set(id, item);
    this.#tree.insert(item);
  }

  /**
   * Remove a node from the index.
   */
  remove(id: string) {
    const existing = this.#items.get(id);
    if (existing) {
      this.#tree.remove(existing, (a, b) => a.id === b.id);
      this.#items.delete(id);
    }
  }

  /**
   * Query all node IDs intersecting the given viewport rectangle.
   */
  queryViewport(
    viewLeft: number,
    viewTop: number,
    viewRight: number,
    viewBottom: number,
  ): Set<string> {
    const results = this.#tree.search({
      minX: viewLeft,
      minY: viewTop,
      maxX: viewRight,
      maxY: viewBottom,
    });

    return new Set(results.map((r) => r.id));
  }

  get size(): number {
    return this.#items.size;
  }

  clear() {
    this.#tree.clear();
    this.#items.clear();
  }
}
