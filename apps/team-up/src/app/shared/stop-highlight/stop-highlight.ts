import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Store } from '@ngrx/store';
import { PageActions } from '../../modules/board/actions/page.actions';
import { MatButtonModule } from '@angular/material/button';
import { isUserHighlighActive } from '../../modules/board/selectors/page.selectors';

@Component({
  selector: 'team-up-stop-highlight',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <div class="wrapper">
      @if (highlight()) {
        <button
          (click)="stop()"
          mat-raised-button
          color="primary">
          Stop highlight user
        </button>
      }
      <div></div>
    </div>
  `,
  styleUrls: ['./stop-highlight.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StopHighlightComponent {
  private store = inject(Store);

  public highlight = this.store.selectSignal(isUserHighlighActive());

  public stop() {
    this.store.dispatch(PageActions.stopHighlight());
  }
}
