import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  effect,
  signal,
} from '@angular/core';

import { BoardFacade } from '../../../../services/board-facade.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { pageFeature } from '../../reducers/page.reducer';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'tapiz-cursors',
  template: `
    @if (showCursors()) {
      @for (user of users(); track user.id) {
        @if (user.cursor) {
          <div
            class="cursor"
            [style.transform]="'scale(' + scale() + ')'"
            [style.top.px]="user.cursor.y"
            [style.left.px]="user.cursor.x">
            <span
            [ngClass]="{'cursor-avatar': user.picture}"
            [style.transform]="'scale(' + scale() + ')'">
              @if (user.picture) {
                <img [src]="user.picture" alt="{{ user.name }}" />
              } @else {
                {{ user.name.charAt(0).toUpperCase() }}
              }
            </span>
          </div>
        }
      }
    }
  `,
  styleUrls: ['./cursors.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class CursorsComponent {
  #store = inject(Store);
  #boardFacade = inject(BoardFacade);

  users = toSignal(this.#boardFacade.selectCursors());
  userZoom = this.#store.selectSignal(pageFeature.selectZoom);

  scale = signal(1);
  #settings = toSignal(this.#boardFacade.getSettings());

  showCursors = computed(() => {
    const settings = this.#settings();

    if (!settings) {
      return true;
    }
    return !settings.content.anonymousMode;
  });

  // Calculate the scale of the cursor based on the user's zoom level
  calcScale = computed(() => {
    const zoom = Math.max(this.userZoom(), 0.1);
    const constant = 0.3;
    const baseSize = 0.8;
    const total = baseSize + (constant / zoom);

    return Math.min(total, 2.5);
  });

  constructor() {
    effect(() => {
      this.scale.set(this.calcScale());
    });
  }
}
