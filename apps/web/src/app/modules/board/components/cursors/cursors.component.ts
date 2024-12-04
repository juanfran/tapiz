import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';

import { BoardFacade } from '../../../../services/board-facade.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'tapiz-cursors',
  template: `
    @if (showCursors()) {
      @for (user of users(); track user.id) {
        @if (user.cursor) {
          <div
            class="cursor"
            [style.top.px]="user.cursor.y"
            [style.left.px]="user.cursor.x">
            <span>{{ user.name.charAt(0).toUpperCase() }}</span>
          </div>
        }
      }
    }
  `,
  styleUrls: ['./cursors.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class CursorsComponent {
  #boardFacade = inject(BoardFacade);
  users = toSignal(this.#boardFacade.selectCursors());

  #settings = toSignal(this.#boardFacade.getSettings());

  showCursors = computed(() => {
    const settings = this.#settings();

    if (!settings) {
      return true;
    }

    return !settings.content.anonymousMode;
  });
}
