import { Directive, HostListener, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { PageActions } from '../actions/page.actions';
import { explicitEffect } from 'ngxtension/explicit-effect';
import { isInputField } from '@tapiz/cdk/utils/is-input-field';
import { pageFeature } from '../reducers/page.reducer';
import { ZoneService } from '../components/zone/zone.service';

@Directive({
  selector: '[tapizBoardShourtcuts]',
  standalone: true,
})
export class BoardShourtcutsDirective {
  #store = inject(Store);
  #zoneService = inject(ZoneService);
  #layer = this.#store.selectSignal(pageFeature.selectBoardMode);
  panInProgress = signal<boolean | null>(null);

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

    this.panInProgress.set(true);
  }

  @HostListener('document:keyup.space', ['$event']) finishPan(
    e: KeyboardEvent,
  ) {
    if (e.repeat) return;

    this.panInProgress.set(false);
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

    this.#store.dispatch(PageActions.selectNodes({ ids: selectedNodes }));
  }

  constructor() {
    explicitEffect([this.panInProgress], ([panInProgress]) => {
      if (panInProgress === null) {
        return;
      }

      this.#store.dispatch(
        PageActions.panInProgress({ panInProgress: panInProgress }),
      );
    });
  }
}
