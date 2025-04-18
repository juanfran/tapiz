import { Directive, HostListener, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { BoardPageActions } from '../actions/board-page.actions';
import { isInputField } from '@tapiz/cdk/utils/is-input-field';
import { boardPageFeature } from '../reducers/boardPage.reducer';
import { ZoneService } from '../components/zone/zone.service';
import { BoardFacade } from '../../../services/board-facade.service';
import { BoardActions } from '../actions/board.actions';
import { NodePatch } from '@tapiz/board-commons';

@Directive({
  selector: '[tapizBoardShourtcuts]',
})
export class BoardShourtcutsDirective {
  #store = inject(Store);
  #zoneService = inject(ZoneService);
  #layer = this.#store.selectSignal(boardPageFeature.selectBoardMode);
  #selectedNodesIds = this.#store.selectSignal(boardPageFeature.selectFocusId);
  #boardFacade = inject(BoardFacade);

  @HostListener('document:keydown.control.z', ['$event']) undoAction(
    e: KeyboardEvent,
  ) {
    if (e.repeat) return;

    this.#store.dispatch(BoardPageActions.undo());
  }

  @HostListener('document:keydown.control.y', ['$event']) redoAction(
    e: KeyboardEvent,
  ) {
    if (e.repeat) return;

    this.#store.dispatch(BoardPageActions.redo());
  }

  @HostListener('document:keydown.space', ['$event']) pan(e: KeyboardEvent) {
    if (e.repeat || isInputField()) return;

    this.#store.dispatch(
      BoardPageActions.panInProgress({ panInProgress: true }),
    );
  }

  @HostListener('document:keyup.space', ['$event']) finishPan(
    e: KeyboardEvent,
  ) {
    if (e.repeat || isInputField()) return;

    this.#store.dispatch(
      BoardPageActions.panInProgress({ panInProgress: false }),
    );
  }

  @HostListener('document:keydown.control.a', ['$event']) selectAll(
    e: KeyboardEvent,
  ) {
    if (isInputField()) return;

    e.preventDefault();

    const selectedNodes = this.#zoneService.nodesInZone({
      relativeRect: document.body.getBoundingClientRect(),
      layer: this.#layer(),
    });

    this.#store.dispatch(BoardPageActions.selectNodes({ ids: selectedNodes }));
  }

  @HostListener('document:keydown.ArrowLeft', ['$event'])
  @HostListener('document:keydown.ArrowRight', ['$event'])
  @HostListener('document:keydown.ArrowUp', ['$event'])
  @HostListener('document:keydown.ArrowDown', ['$event'])
  move(e: KeyboardEvent) {
    if (isInputField() || !this.#selectedNodesIds().length) return;

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
  }
}
