import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { BoardPageActions } from '../../actions/board-page.actions';
import { BoardFacade } from '../../../../services/board-facade.service';
import { isInputField } from '@tapiz/cdk/utils/is-input-field';

function isBoardZoomShortcut(event: KeyboardEvent) {
  return !event.ctrlKey && !event.metaKey && !isInputField();
}

export function isZoomInShortcut(event: KeyboardEvent) {
  return (
    !event.altKey &&
    isBoardZoomShortcut(event) &&
    (event.key === '+' || event.code === 'NumpadAdd')
  );
}

export function isZoomOutShortcut(event: KeyboardEvent) {
  return (
    !event.altKey &&
    isBoardZoomShortcut(event) &&
    (event.key === '-' || event.code === 'NumpadSubtract')
  );
}

@Component({
  selector: 'tapiz-zoom-control',
  imports: [],
  template: `<button
      title="Zoom out (-)"
      (click)="decrease()"
      type="button">
      -
    </button>
    <span class="percentage">{{ zoomPercentage() }}</span>
    <button
      title="Zoom in (+)"
      (click)="increase()"
      type="button">
      +
    </button>`,
  styleUrl: './zoom-control.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class ZoomControlComponent {
  #store = inject(Store);
  #zoom = this.#store.selectSignal(boardPageFeature.selectZoom);
  #userPosition = this.#store.selectSignal(boardPageFeature.selectPosition);
  boardFacade = inject(BoardFacade);

  zoomPercentage = computed(() => {
    return `${Math.round(this.#zoom() * 100)}%`;
  });

  onDocumentKeydown(event: KeyboardEvent) {
    const zoomInWithZ =
      event.key === 'z' &&
      !event.altKey &&
      !event.repeat &&
      isBoardZoomShortcut(event);
    const zoomOutWithAltZ =
      event.key === 'z' &&
      event.altKey &&
      !event.repeat &&
      isBoardZoomShortcut(event);

    if (zoomInWithZ || isZoomInShortcut(event)) {
      event.preventDefault();
      this.increase();
    } else if (zoomOutWithAltZ || isZoomOutShortcut(event)) {
      event.preventDefault();
      this.decrease();
    }
  }

  setNewZoom(zoom: number) {
    if (zoom < 0.1) {
      zoom = 0.1;
    } else if (zoom > 2.5) {
      zoom = 2.5;
    }

    if (this.#zoom() === zoom) {
      return;
    }

    const { width, height } = document.body.getBoundingClientRect();

    const currentZoom = this.#zoom();

    const positionX = (-this.#userPosition().x + width / 2) / currentZoom;
    const centerX = -positionX * zoom + width / 2;

    const positionY = (-this.#userPosition().y + height / 2) / currentZoom;
    const centerY = -positionY * zoom + height / 2;

    this.#store.dispatch(
      BoardPageActions.setUserView({
        zoom,
        position: {
          x: centerX,
          y: centerY,
        },
      }),
    );
  }

  increase() {
    this.setNewZoom(this.#zoom() + 0.1);
  }

  decrease() {
    this.setNewZoom(this.#zoom() - 0.1);
  }
}
