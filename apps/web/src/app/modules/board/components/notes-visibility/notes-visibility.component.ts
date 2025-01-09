import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { selectUserId } from '../../selectors/page.selectors';
import { BoardActions } from '../../actions/board.actions';
import { map } from 'rxjs/operators';
import { CdkMenu, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import { BoardFacade } from '../../../../services/board-facade.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { isNote, StateActions } from '@tapiz/board-commons';

@Component({
  selector: 'tapiz-notes-visibility',
  styleUrls: ['./notes-visibility.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkMenuTrigger, CdkMenu, MatIconModule, CdkMenuItemRadio],
  template: `
    <div class="right-col-toolbar note-visibility">
      <button
        [cdkMenuTriggerFor]="selectVisibility"
        [class.no-visible]="!visible()">
        <span class="title">Notes visibility</span>
        <span class="value">
          @if (visible()) {
            Public
          } @else {
            Private
          }
        </span>
      </button>
    </div>
    <ng-template #selectVisibility>
      <div
        class="menu radio-menu"
        cdkMenu>
        <button
          cdkMenuItemRadio
          class="radio-menu-item"
          [class.selected]="visible()"
          (cdkMenuItemTriggered)="setVisibility(true)">
          <p>Public</p>
          <p>Yours notes will be visible to everyone</p>
        </button>
        <button
          cdkMenuItemRadio
          class="radio-menu-item"
          [class.selected]="!visible()"
          (cdkMenuItemTriggered)="setVisibility(false)">
          <p>Private</p>
          <p>Yours notes will be visible only to you</p>
        </button>
      </div>
    </ng-template>
  `,
})
export class NotesVisibilityComponent {
  #store = inject(Store);
  #boardFacade = inject(BoardFacade);
  #users = toSignal(
    this.#boardFacade
      .getUsers()
      .pipe(map((users) => users.map((user) => user.content))),
    { initialValue: [] },
  );
  userId = this.#store.selectSignal(selectUserId);
  currentUser = computed(() => {
    return this.#users()?.find((user) => user.id === this.userId());
  });
  visible = computed(() => this.currentUser()?.visible);

  setVisibility(visible: boolean) {
    const notesActions: StateActions[] = this.#boardFacade
      .get()
      .filter((it) => {
        return (
          isNote(it) &&
          (it.content.textHidden ?? null) !== null &&
          it.content.ownerId === this.userId()
        );
      })
      .map((it) => {
        return {
          data: {
            type: 'note',
            id: it.id,
            content: {
              textHidden: null,
            },
          },
          op: 'patch',
        };
      });

    this.#store.dispatch(
      BoardActions.batchNodeActions({
        history: false,
        actions: [
          ...notesActions,
          {
            data: {
              type: 'user',
              id: this.userId(),
              content: {
                visible,
              },
            },
            op: 'patch',
          },
        ],
      }),
    );
  }
}
