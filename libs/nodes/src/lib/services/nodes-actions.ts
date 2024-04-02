import { Injectable, inject } from '@angular/core';
import { NodeAdd, NodePatch, TuNode } from '@team-up/board-commons';
import { NodesStore } from './nodes.store';
import { v4 } from 'uuid';

interface Options {
  parent?: string;
  position?: number;
}

@Injectable({
  providedIn: 'root',
})
export class NodesActions {
  #nodesStore = inject(NodesStore);

  add<T>(type: string, content: T, options?: Options): NodeAdd<T> {
    const nodeAdd = {
      data: {
        type,
        id: v4(),
        content,
      },
      op: 'add',
    } as NodeAdd<T>;

    if (options?.parent) {
      nodeAdd.parent = options.parent;
    }

    const positionCandidate = this.#getPositionCandidate(
      type,
      options?.position,
    );

    nodeAdd.position = positionCandidate;

    return nodeAdd;
  }
  patch<T>(node: TuNode<Partial<T>>, options?: Options): NodePatch<T> {
    const nodePatch = {
      data: node,
      op: 'patch',
    } as NodePatch<T>;

    if (options?.parent) {
      nodePatch.parent = options.parent;
    }

    const positionCandidate = this.#getPositionCandidatePatch(
      node.type,
      node.id,
      options?.position,
    );

    nodePatch.position = positionCandidate;

    return nodePatch;
  }

  bulkPatch(nodes: { node: TuNode; options?: Options }[]): NodePatch[] {
    const storeNodes = this.#nodesStore.nodes();

    const actions = nodes
      .toSorted((a, b) => {
        const aIndex = storeNodes.findIndex((it) => it.id === a.node.id);
        const bIndex = storeNodes.findIndex((it) => it.id === b.node.id);

        return aIndex - bIndex;
      })
      .map(({ node, options }) => this.patch<object>(node, options));

    return actions;
  }

  #getPositionCandidatePatch(type: string, id: string, position?: number) {
    if (position !== undefined) {
      if (position === -1) {
        return this.#nodesStore.nodes().length - 1;
      }

      return position;
    }

    const nodes = this.#nodesStore.nodes();
    const current = nodes.findLastIndex((it) => it.id === id);

    if (type === 'group') {
      const to = nodes.findLastIndex(
        (it) => it.id !== id && (it.type === 'panel' || it.type === 'group'),
      );

      if (to !== -1) {
        if (current > to) {
          return current;
        }

        return to;
      }

      return 0;
    } else if (type === 'panel') {
      const to = nodes.findLastIndex(
        (it) => it.type === 'panel' && it.id !== id,
      );

      if (to !== -1) {
        if (current > to) {
          return current;
        }

        return to;
      }

      return 0;
    }

    return this.#nodesStore.nodes().length - 1;
  }

  #getPositionCandidate(type: string, position?: number) {
    if (position !== undefined) {
      if (position === -1) {
        return this.#nodesStore.nodes().length - 1;
      }

      return position;
    }

    const nodes = this.#nodesStore.nodes();

    if (type === 'group') {
      const to = nodes.findLastIndex(
        (it) => it.type === 'panel' || it.type === 'group',
      );

      if (to !== -1) {
        return to + 1;
      }

      return 0;
    } else if (type === 'panel') {
      const to = nodes.findLastIndex((it) => it.type === 'panel');

      if (to !== -1) {
        return to + 1;
      }

      return 0;
    }

    return this.#nodesStore.nodes().length;
  }
}
