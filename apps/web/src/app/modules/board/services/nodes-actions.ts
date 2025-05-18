import { Injectable, inject } from '@angular/core';
import { NodeAdd, NodePatch, TNode, ContentOfNode } from '@tapiz/board-commons';
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

  add<T extends TNode['type']>(
    type: T,
    content: ContentOfNode<T>,
    options?: Options,
  ): NodeAdd {
    const nodeAdd: NodeAdd = {
      data: {
        type,
        id: v4(),
        content,
      },
      op: 'add',
    };

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

  bulkAdd<T extends TNode['type']>(
    nodes: { type: T; content: ContentOfNode<T>; options?: Options }[],
  ) {
    const actions = nodes.map(({ type, content, options }) =>
      this.add(type, content, options),
    );

    return actions;
  }

  patch<T extends TNode['type']>(
    data: {
      id: string;
      type: T;
      content: Partial<ContentOfNode<T>>;
    },
    options?: { parent?: string; position?: number },
  ): NodePatch {
    const nodePatch = {
      op: 'patch' as const,
      data,
      parent: options?.parent,
      position: this.getPositionCandidatePatch(
        data.type,
        data.id,
        options?.position,
      ),
    } as NodePatch;
    return nodePatch;
  }

  bulkPatch(nodes: { node: TNode; options?: Options }[]): NodePatch[] {
    const storeNodes = this.#boardFacade.nodes();

    const actions = nodes
      .toSorted((a, b) => {
        const aIndex = storeNodes.findIndex((it) => it.id === a.node.id);
        const bIndex = storeNodes.findIndex((it) => it.id === b.node.id);

        return aIndex - bIndex;
      })
      .map(({ node, options }) => this.patch(node, options));

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
