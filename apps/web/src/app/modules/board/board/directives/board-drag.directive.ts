import { Directive, inject } from '@angular/core';
import { MultiDragService } from '@tapiz/cdk/services/multi-drag.service';
import { BoardFacade } from '../../../../services/board-facade.service';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import {
  BoardTNode,
  isBoardTNode,
  isGroup,
  isPanel,
} from '@tapiz/board-commons';
import { nodesInsideNode } from '@tapiz/cdk/utils/nodes-inside';
import { getNodeSize } from '../../../../shared/node-size';
import { NodesActions } from '../../services/nodes-actions';
import { BoardActions } from '@tapiz/board-commons/actions/board.actions';
import { BoardPageActions } from '../../actions/board-page.actions';

@Directive({
  selector: '[tapizBoardDragDirective]',
})
export class BoardDragDirective {
  #multiDragService = inject(MultiDragService);
  #boardFacade = inject(BoardFacade);
  #store = inject(Store);
  #nodesActions = inject(NodesActions);

  readonly #focusIds = this.#store.selectSignal(boardPageFeature.selectFocusId);

  constructor() {
    this.#multiDragService.setUp({
      dragEnabled: this.#store.select(boardPageFeature.selectDragEnabled),
      zoom: this.#store.select(boardPageFeature.selectZoom),
      relativePosition: this.#store.select(boardPageFeature.selectPosition),
      draggableIds: (triggerNode: string) => {
        const node = this.#boardFacade.getNode(triggerNode);
        if (
          node &&
          (isPanel(node) || isGroup(node)) &&
          !node.content.unLocked
        ) {
          const nodesInside = nodesInsideNode(
            node,
            this.#boardFacade
              .get()
              .filter((itNode): itNode is BoardTNode => {
                if (!isBoardTNode(itNode)) {
                  return false;
                }

                if (node.content.layer === 1) {
                  return true;
                }

                return itNode.content.layer === node.content.layer;
              })
              .map((node) => {
                const { width, height } = getNodeSize(node);

                return {
                  ...node,
                  content: {
                    ...node.content,
                    width,
                    height,
                  },
                };
              }),
          );

          const nodeIds = nodesInside.map((node) => node.id);

          return [...nodeIds, ...this.#focusIds()];
        }

        return this.#focusIds();
      },
      nodes: () => {
        return this.#boardFacade.get();
      },
      move: (elements) => {
        const nodes = elements.map(({ draggable, position }) => {
          return {
            node: {
              type: draggable.nodeType,
              id: draggable.id,
              content: {
                position,
              },
            },
          };
        });

        const actions = this.#nodesActions.bulkPatch(nodes);

        this.#store.dispatch(
          BoardActions.batchNodeActions({
            history: false,
            actions,
          }),
        );
      },
      end: (dragElements) => {
        const actions = dragElements.map((action) => {
          return {
            nodeType: action.draggable.nodeType,
            id: action.draggable.id,
            initialPosition: action.initialPosition,
            initialIndex: action.initialIndex,
            finalPosition: action.finalPosition,
          };
        });
        if (actions.length) {
          this.#store.dispatch(
            BoardPageActions.endDragNode({ nodes: actions }),
          );
        }
      },
    });
  }
}
