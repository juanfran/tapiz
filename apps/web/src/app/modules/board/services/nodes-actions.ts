import { Injectable, inject } from '@angular/core';
import { NodeAdd, NodePatch, TuNode } from '@tapiz/board-commons';
import { v4 } from 'uuid';
import { BoardFacade } from '../../../services/board-facade.service';

interface Options {
  parent?: string;
  position?: number;
}

@Injectable({
  providedIn: 'root',
})
export class NodesActions {
  #boardFacade = inject(BoardFacade);

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

    const positionCandidate = this.getPositionCandidate(
      type,
      options?.position,
    );

    nodeAdd.position = positionCandidate;

    return nodeAdd;
  }

  bulkAdd(nodes: { type: string; content: object; options?: Options }[]) {
    const actions = nodes.map(({ type, content, options }) =>
      this.add(type, content, options),
    );

    return actions;
  }

  patch<T>(node: TuNode<Partial<T>>, options?: Options): NodePatch<T> {
    const nodePatch = {
      data: node,
      op: 'patch',
    } as NodePatch<T>;

    if (options?.parent) {
      nodePatch.parent = options.parent;
    }

    const positionCandidate = this.getPositionCandidatePatch(
      node.type,
      node.id,
      options?.position,
    );

    nodePatch.position = positionCandidate;

    return nodePatch;
  }

  bulkPatch(nodes: { node: TuNode; options?: Options }[]): NodePatch[] {
    const storeNodes = this.#boardFacade.nodes();

    const actions = nodes
      .toSorted((a, b) => {
        const aIndex = storeNodes.findIndex((it) => it.id === a.node.id);
        const bIndex = storeNodes.findIndex((it) => it.id === b.node.id);

        return aIndex - bIndex;
      })
      .map(({ node, options }) => this.patch<object>(node, options));

    return actions;
  }

  getPositionCandidatePatch(type: string, id: string, position?: number) {
    if (position !== undefined) {
      if (position === -1) {
        return this.#boardFacade.nodes().length - 1;
      }

      return position;
    }

    const nodes = this.#boardFacade.nodes();
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

    return this.#boardFacade.nodes().length - 1;
  }

  getPositionCandidate(type: string, position?: number) {
    if (position !== undefined) {
      if (position === -1) {
        return this.#boardFacade.nodes().length - 1;
      }

      return position;
    }

    const nodes = this.#boardFacade.nodes();

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

    return this.#boardFacade.nodes().length;
  }
}
