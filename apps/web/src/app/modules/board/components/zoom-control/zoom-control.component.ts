import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { pageFeature } from '../../reducers/page.reducer';
import { PageActions } from '../../actions/page.actions';
import { BoardFacade } from '../../../../services/board-facade.service';
import { isInputField } from '@tapiz/cdk/utils/is-input-field';

@Component({
  selector: 'tapiz-zoom-control',
  imports: [],
  template: `<button
      title="Zoom out"
      (click)="decrease()"
      type="button">
      -
    </button>
    <span class="percentage">{{ zoomPercentage() }}</span>
    <button
      title="Zoom in"
      (click)="increase()"
      type="button">
      +
    </button>`,
  styleUrl: './zoom-control.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZoomControlComponent {
  #store = inject(Store);
  #zoom = this.#store.selectSignal(pageFeature.selectZoom);
  #userPosition = this.#store.selectSignal(pageFeature.selectPosition);
  boardFacade = inject(BoardFacade);

  zoomPercentage = computed(() => {
    return `${Math.round(this.#zoom() * 100)}%`;
  });

  @HostListener('document:keydown.z', ['$event']) zoomIn(e: KeyboardEvent) {
    if (e.repeat || isInputField()) return;

    e.preventDefault();

    this.increase();
  }

  @HostListener('document:keydown.alt.z', ['$event']) zoomOut(
    e: KeyboardEvent,
  ) {
    if (e.repeat || isInputField()) return;

    e.preventDefault();

    this.decrease();
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
      PageActions.setUserView({
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
