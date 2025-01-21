import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Store } from '@ngrx/store';
import { BoardPageActions } from '../../modules/board/actions/board-page.actions';
import { MatButtonModule } from '@angular/material/button';
import { boardPageFeature } from '../../modules/board/reducers/boardPage.reducer';

@Component({
  selector: 'tapiz-stop-highlight',
  imports: [MatButtonModule],
  template: `
    @if (highlight()) {
      <button
        (click)="stop()"
        mat-raised-button
        color="primary">
        Stop highlight user
      </button>
    }
  `,
  styleUrls: ['./stop-highlight.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StopHighlightComponent {
  #store = inject(Store);

  highlight = this.#store.selectSignal(boardPageFeature.isUserHighlighActive);

  stop() {
    this.#store.dispatch(BoardPageActions.stopHighlight());
  }
}
