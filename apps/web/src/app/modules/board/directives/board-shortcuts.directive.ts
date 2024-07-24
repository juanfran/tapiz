import { Directive, HostListener, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { PageActions } from '../actions/page.actions';
import { explicitEffect } from 'ngxtension/explicit-effect';

@Directive({
  selector: '[tapizBoardShourtcuts]',
  standalone: true,
})
export class BoardShourtcutsDirective {
  #store = inject(Store);
  panInProgresss = signal<boolean | null>(null);

  @HostListener('document:keydown.control.z', ['$event']) undoAction(
    e: KeyboardEvent,
  ) {
    if (e.repeat) return;

    this.#store.dispatch(PageActions.undo());
  }

  @HostListener('document:keydown.control.y', ['$event']) redoAction(
    e: KeyboardEvent,
  ) {
    if (e.repeat) return;

    this.#store.dispatch(PageActions.redo());
  }

  @HostListener('document:keydown.space', ['$event']) pan(e: KeyboardEvent) {
    if (e.repeat) return;

    this.panInProgresss.set(true);
  }

  @HostListener('document:keyup.space', ['$event']) finishPan(
    e: KeyboardEvent,
  ) {
    if (e.repeat) return;

    this.panInProgresss.set(false);
  }

  constructor() {
    explicitEffect([this.panInProgresss], ([panInProgress]) => {
      if (panInProgress === null) {
        return;
      }

      if (panInProgress) {
        this.#store.dispatch(PageActions.setBoardCursor({ cursor: 'grab' }));
        this.#store.dispatch(PageActions.setNodeSelection({ enabled: false }));
      } else {
        this.#store.dispatch(PageActions.setBoardCursor({ cursor: 'default' }));
        this.#store.dispatch(PageActions.setNodeSelection({ enabled: true }));
      }
    });
  }
}
