import { Directive, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { filter, fromEvent } from 'rxjs';
import { BoardPageActions } from '../actions/board-page.actions';
import { isInputField } from '@tapiz/cdk/utils/is-input-field';
import { boardPageFeature } from '../reducers/boardPage.reducer';
import { ZoneService } from '../components/zone/zone.service';
import { BoardFacade } from '../../../services/board-facade.service';
import { BoardActions } from '../actions/board.actions';
import { NodePatch } from '@tapiz/board-commons';
import { NodesStore } from '../services/nodes.store';

@Directive({
  selector: '[tapizBoardShourtcuts]',
})
export class BoardShourtcutsDirective {
  #store = inject(Store);
  #zoneService = inject(ZoneService);
  #layer = this.#store.selectSignal(boardPageFeature.selectBoardMode);
  #selectedNodesIds = this.#store.selectSignal(boardPageFeature.selectFocusId);
  #boardFacade = inject(BoardFacade);
  #nodesStore = inject(NodesStore);

  constructor() {
    // Undo (Ctrl+Z)
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        takeUntilDestroyed(),
        filter((e) => e.ctrlKey && e.key === 'z' && !e.repeat),
      )
      .subscribe((e) => {
        e.preventDefault();
        this.#store.dispatch(BoardPageActions.undo());
      });

    // Redo (Ctrl+Y)
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        takeUntilDestroyed(),
        filter((e) => e.ctrlKey && e.key === 'y' && !e.repeat),
      )
      .subscribe(() => {
        this.#store.dispatch(BoardPageActions.redo());
      });

    // Pan (Space down)
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        takeUntilDestroyed(),
        filter((e) => e.key === ' ' && !e.repeat && !isInputField()),
      )
      .subscribe(() => {
        this.#store.dispatch(
          BoardPageActions.panInProgress({ panInProgress: true }),
        );
      });

    // Finish pan (Space up)
    fromEvent<KeyboardEvent>(document, 'keyup')
      .pipe(
        takeUntilDestroyed(),
        filter((e) => e.key === ' ' && !e.repeat && !isInputField()),
      )
      .subscribe(() => {
        this.#store.dispatch(
          BoardPageActions.panInProgress({ panInProgress: false }),
        );
      });

    // Select all (Ctrl+A)
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        takeUntilDestroyed(),
        filter((e) => e.ctrlKey && e.key === 'a' && !isInputField()),
      )
      .subscribe((e) => {
        e.preventDefault();

        const selectedNodes = this.#zoneService.nodesInZone({
          relativeRect: document.body.getBoundingClientRect(),
          layer: this.#layer(),
        });

        this.#store.dispatch(
          BoardPageActions.selectNodes({ ids: selectedNodes }),
        );
      });

    // Arrow keys movement
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        takeUntilDestroyed(),
        filter(
          (e) =>
            ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
              e.key,
            ) &&
            !isInputField() &&
            this.#selectedNodesIds().length > 0,
        ),
      )
      .subscribe((e) => {
        const movePx = 20;

        let diff = { x: 0, y: 0 };

        switch (e.key) {
          case 'ArrowLeft':
            diff = { x: -movePx, y: 0 };
            break;
          case 'ArrowRight':
            diff = { x: movePx, y: 0 };
            break;
          case 'ArrowUp':
            diff = { x: 0, y: -movePx };
            break;
          case 'ArrowDown':
            diff = { x: 0, y: movePx };
            break;
        }

        const nodes = this.#boardFacade
          .nodes()
          .filter((node) => this.#selectedNodesIds().includes(node.id));
        const boardNodes = this.#boardFacade.filterBoardNodes(nodes);
        const actions: NodePatch[] = boardNodes.map((node) => {
          return {
            data: {
              id: node.id,
              type: node.type,
              content: {
                position: {
                  x: node.content.position.x + diff.x,
                  y: node.content.position.y + diff.y,
                },
              },
            },
            op: 'patch',
          };
        });

        this.#store.dispatch(
          BoardActions.batchNodeActions({
            history: true,
            actions,
          }),
        );
      });

    // Layer ordering (Ctrl+[ and Ctrl+])
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        takeUntilDestroyed(),
        filter(
          (e) =>
            e.ctrlKey &&
            !e.repeat &&
            !isInputField() &&
            (e.code === 'BracketLeft' || e.code === 'BracketRight'),
        ),
      )
      .subscribe((e) => {
        e.preventDefault();

        const selectedNodes = this.#boardFacade
          .nodes()
          .filter((node) => this.#selectedNodesIds().includes(node.id));

        if (!selectedNodes.length) return;

        if (e.shiftKey) {
          if (e.code === 'BracketLeft') {
            this.#nodesStore.sendToBack(selectedNodes);
          } else if (e.code === 'BracketRight') {
            this.#nodesStore.bringToFront(selectedNodes);
          }
        } else {
          if (e.code === 'BracketRight') {
            this.#nodesStore.bringForward(selectedNodes);
          } else if (e.code === 'BracketLeft') {
            this.#nodesStore.sendBackward(selectedNodes);
          }
        }
      });
  }
}
