import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Store } from '@ngrx/store';
import { PageActions } from '../../modules/board/actions/page.actions';
import { MatButtonModule } from '@angular/material/button';
import { isUserHighlighActive } from '../../modules/board/selectors/page.selectors';

@Component({
  selector: 'tapiz-stop-highlight',
  standalone: true,
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

  highlight = this.#store.selectSignal(isUserHighlighActive());

  stop() {
    this.#store.dispatch(PageActions.stopHighlight());
  }
}
