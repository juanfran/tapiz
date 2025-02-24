import { Directive, inject } from '@angular/core';
import { BoardFacade } from '../../../../services/board-facade.service';
import { Store } from '@ngrx/store';
import { isResizable, StateActions } from '@tapiz/board-commons';
import { NodesActions } from '../../services/nodes-actions';
import { BoardActions } from '@tapiz/board-commons/actions/board.actions';
import { ResizeService } from '@tapiz/ui/resize';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Resizable, TuNode } from '@tapiz/board-commons';
import { filter, map, share } from 'rxjs';
import {
  translate,
  rotate,
  compose,
  decomposeTSR,
} from 'transformation-matrix';
@Directive({
  selector: '[tapizBoarResizeDirective]',
})
export class BoardResizeDirective {
  #resizeService = inject(ResizeService);
  #boardFacade = inject(BoardFacade);
  #store = inject(Store);
  #nodesActions = inject(NodesActions);
  #selectFocusNodes = this.#boardFacade.focusNodes;
  #initialNodes: TuNode<Resizable>[] = [];

  constructor() {
    const onResize$ = this.#resizeService.onResize$.pipe(
      takeUntilDestroyed(),
      share(),
    );

    onResize$.pipe(filter((event) => event.type === 'start')).subscribe(() => {
      this.#boardFacade.patchHistory((history) => {
        const focusedNodes = this.#selectFocusNodes();

        if (!focusedNodes) {
          return history;
        }

        this.#initialNodes = focusedNodes.filter(isResizable);

        const actions: StateActions[] = this.#initialNodes.map((node) => {
          return {
            data: {
              id: node.id,
              type: node.type,
              content: {
                position: { ...node.content.position },
                width: node.content.width,
                height: node.content.height,
              },
            } as TuNode<Resizable>,
            op: 'patch',
          };
        });

        history.past.unshift(actions);
        history.future = [];

        return history;
      });
    });

    onResize$
      .pipe(
        filter((event) => event.type === 'move'),
        map((mouseMove) => {
          const shiftKey = mouseMove.event.shiftKey;

          return this.#initialNodes.map((node) => {
            const nodeInitial = this.#initialNodes.find(
              (n) => n.id === node.id,
            );

            if (!nodeInitial) {
              return;
            }

            const diffX = mouseMove.event.x - mouseMove.initialPosition.x;
            const diffY = mouseMove.event.y - mouseMove.initialPosition.y;

            const rotation = mouseMove.nodeRotation ?? 0;
            const angle = rotation * (Math.PI / 180);
            let deltaX = Math.round(
              diffX * Math.cos(angle) + diffY * Math.sin(angle),
            );
            let deltaY = Math.round(
              diffY * Math.cos(angle) - diffX * Math.sin(angle),
            );

            if (shiftKey) {
              const originalWidth = nodeInitial.content.width;
              const originalHeight = nodeInitial.content.height;
              let m;

              switch (mouseMove.position) {
                case 'top-left':
                  m = originalHeight / originalWidth;
                  break;
                case 'top-right':
                  m = -originalHeight / originalWidth;
                  break;
                case 'bottom-left':
                  m = -originalHeight / originalWidth;
                  break;
                case 'bottom-right':
                  m = originalHeight / originalWidth;
                  break;
                default:
                  m = 0;
              }

              const denominator = 1 + m * m;
              const adjustedDeltaX = (deltaX + m * deltaY) / denominator;
              const adjustedDeltaY = m * adjustedDeltaX;

              deltaX = Math.round(adjustedDeltaX);
              deltaY = Math.round(adjustedDeltaY);
            }

            let newWidth = nodeInitial.content.width;
            let newHeight = nodeInitial.content.height;

            let currentMatrix = compose(
              translate(
                nodeInitial.content.position.x,
                nodeInitial.content.position.y,
              ),
              rotate(angle),
            );

            if (mouseMove.position === 'top-left') {
              newWidth -= deltaX;
              newHeight -= deltaY;
              currentMatrix = compose(currentMatrix, translate(deltaX, deltaY));
            } else if (mouseMove.position === 'top-right') {
              newWidth += deltaX;
              newHeight -= deltaY;
              currentMatrix = compose(currentMatrix, translate(0, deltaY));
            } else if (mouseMove.position === 'bottom-left') {
              newWidth -= deltaX;
              newHeight += deltaY;
              currentMatrix = compose(currentMatrix, translate(deltaX, 0));
            } else if (mouseMove.position === 'bottom-right') {
              newWidth += deltaX;
              newHeight += deltaY;
            }

            const decomposed = decomposeTSR(currentMatrix);

            if (newWidth < 5 || newHeight < 5) {
              return;
            }

            return {
              id: node.id,
              type: node.type,
              content: {
                position: {
                  x: decomposed.translate.tx,
                  y: decomposed.translate.ty,
                },
                width: newWidth,
                height: newHeight,
              },
            } as TuNode<Resizable>;
          });
        }),
      )
      .subscribe((nodes) => {
        const actions = nodes
          .filter((node) => !!node)
          .map((node) => {
            return this.#nodesActions.patch(node);
          });

        this.#store.dispatch(
          BoardActions.batchNodeActions({
            history: false,
            actions,
          }),
        );
      });
  }
}
