import { Injectable, inject } from '@angular/core';
import { TuNode, isBoardTuNode } from '@tapiz/board-commons';
import { Store } from '@ngrx/store';
import { BoardActions } from '@tapiz/board-commons/actions/board.actions';
import { BoardPageActions } from '../actions/board-page.actions';
import { NodesActions } from './nodes-actions';
import { BoardFacade } from '../../../services/board-facade.service';
import { overlappingNodes } from '@tapiz/cdk/utils/overlapping-nodes';
import { getNodeSize } from '../../../shared/node-size';

@Injectable({
  providedIn: 'root',
})
export class NodesStore {
  #store = inject(Store);
  #nodesActions = inject(NodesActions);
  #boardFacade = inject(BoardFacade);

  setFocusNode(event: { id: string; ctrlKey: boolean }) {
    this.#store.dispatch(
      BoardPageActions.setFocusId({
        focusId: event.id,
        ctrlKey: event.ctrlKey,
      }),
    );
  }

  deleteNodes(nodes: { id: string; type: string }[], history?: boolean) {
    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: history ?? true,
        actions: nodes.map((node) => {
          return {
            data: {
              type: node.type,
              id: node.id,
            },
            op: 'remove',
          };
        }),
      }),
    );
  }

  copyNodes(nodes: TuNode[]) {
    navigator.clipboard.writeText(JSON.stringify(nodes));
  }

  fetchMentions() {
    this.#store.dispatch(BoardPageActions.fetchMentions());
  }

  mentionUser(userId: string, nodeId: string) {
    this.#store.dispatch(
      BoardPageActions.mentionUser({
        userId,
        nodeId,
      }),
    );
  }

  bringToFront(nodes: TuNode[]) {
    const actions = this.#nodesActions.bulkPatch(
      nodes.map((it) => {
        return {
          node: {
            id: it.id,
            type: it.type,
            content: {},
          },
          options: {
            position: -1,
          },
        };
      }),
    );

    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions,
      }),
    );
  }

  sendToBack(nodes: TuNode[]) {
    const actions = this.#nodesActions
      .bulkPatch(
        nodes.map((it) => {
          return {
            node: {
              id: it.id,
              type: it.type,
              content: {},
            },
            options: {
              position: 0,
            },
          };
        }),
      )
      .toReversed();

    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: true,
        actions,
      }),
    );
  }

  bringForward(nodes: TuNode[]) {
    const allNodes = this.#boardFacade.nodes();
    const selectedIds = nodes.map((n) => n.id);

    nodes.filter(isBoardTuNode).map((node) => {
      const { width, height } = getNodeSize(node);
      const overlapping = overlappingNodes(
        {
          position: node.content.position,
          width,
          height,
        },
        allNodes,
      );

      const currentIndex = overlapping.findIndex((it) => it.id === node.id);
      // Find the next overlapping node that is NOT selected
      const nextNode = overlapping
        .slice(currentIndex + 1)
        .find((n) => !selectedIds.includes(n.id));

      if (!nextNode) {
        return null;
      }

      const indexNext = allNodes.findIndex((it) => it.id === nextNode.id);

      const nodePatch = {
        node: {
          id: node.id,
          type: node.type,
          content: {},
        },
        options: {
          position: indexNext,
        },
      };

      const actions = this.#nodesActions.bulkPatch([nodePatch]);

      this.#store.dispatch(
        BoardActions.batchNodeActions({
          history: true,
          actions,
        }),
      );

      return;
    });
  }

  sendBackward(nodes: TuNode[]) {
    const allNodes = this.#boardFacade.nodes();
    const selectedIds = nodes.map((n) => n.id);

    nodes
      .toReversed()
      .filter(isBoardTuNode)
      .forEach((node) => {
        const { width, height } = getNodeSize(node);
        const overlapping = overlappingNodes(
          {
            position: node.content.position,
            width,
            height,
          },
          allNodes,
        );

        const currentIndex = overlapping.findIndex((it) => it.id === node.id);
        // Find the previous overlapping node that is NOT selected
        const prevNode = [...overlapping.slice(0, currentIndex)]
          .reverse()
          .find((n) => !selectedIds.includes(n.id));
        if (!prevNode) {
          return null;
        }

        const indexPrev = allNodes.findIndex((it) => it.id === prevNode.id);
        const nodePatch = {
          node: {
            id: node.id,
            type: node.type,
            content: {},
          },
          options: {
            position: indexPrev,
          },
        };

        const actions = this.#nodesActions.bulkPatch([nodePatch]);

        this.#store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
            actions,
          }),
        );

        return;
      });
  }
}
