import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { BoardFacade } from '../../../../services/board-facade.service';
import { MatButtonModule } from '@angular/material/button';
import { BoardPageActions } from '../../actions/board-page.actions';
import { boardPageFeature } from '../../reducers/boardPage.reducer';
import { BoardActions } from '../estimation/estimation.component';
import { v4 } from 'uuid';

@Component({
  selector: 'tapiz-set-board-center',
  imports: [MatButtonModule],
  template: `@if (showSetBoardCenter()) {
    <div class="wrapper">
      <div class="center"></div>
    </div>
    <div class="actions-wrapper">
      <div class="actions">
        <button
          type="button"
          color="primary"
          (click)="setInitialPosition()"
          mat-flat-button>
          Set new center
        </button>
        <button
          type="button"
          color="warn"
          (click)="cancel()"
          mat-flat-button>
          Cancel
        </button>
      </div>
    </div>
  }`,
  styleUrl: './set-board-center.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetBoardCenterComponent {
  #store = inject(Store);
  #boardFacade = inject(BoardFacade);
  #zoom = this.#store.selectSignal(boardPageFeature.selectZoom);
  #position = this.#store.selectSignal(boardPageFeature.selectPosition);
  #settings = computed(() => {
    return this.#boardFacade.nodes().find((it) => it.type === 'settings');
  });

  showSetBoardCenter = this.#store.selectSignal(
    (state) => state.boardPage.showSetBoardCenter,
  );

  cancel() {
    this.#store.dispatch(
      BoardPageActions.setShowSetBoardCenter({
        show: false,
      }),
    );
  }

  setInitialPosition() {
    const settings = this.#settings();
    if (settings) {
      this.#store.dispatch(
        BoardActions.batchNodeActions({
          history: false,
          actions: [
            {
              data: {
                type: 'settings',
                id: settings.id,
                content: {
                  ...settings.content,
                  boardCenter: {
                    x: this.#position().x,
                    y: this.#position().y,
                    zoom: this.#zoom(),
                  },
                },
              },
              op: 'patch',
            },
          ],
        }),
      );
    } else {
      this.#store.dispatch(
        BoardActions.batchNodeActions({
          history: false,
          actions: [
            {
              data: {
                type: 'settings',
                id: v4(),
                content: {
                  boardCenter: {
                    x: this.#position().x,
                    y: this.#position().y,
                    zoom: this.#zoom(),
                  },
                },
              },
              op: 'add',
            },
          ],
        }),
      );
    }

    this.#store.dispatch(
      BoardPageActions.setShowSetBoardCenter({
        show: false,
      }),
    );
  }
}
