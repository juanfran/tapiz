import { Directive, HostListener, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { PageActions } from '../actions/page.actions';

@Directive({
  selector: '[tapizBoardShourtcuts]',
  standalone: true,
})
export class BoardShourtcutsDirective {
  #store = inject(Store);

  @HostListener('document:keydown.control.z') undoAction() {
    this.#store.dispatch(PageActions.undo());
  }

  @HostListener('document:keydown.control.y') redoAction() {
    this.#store.dispatch(PageActions.redo());
  }
}
