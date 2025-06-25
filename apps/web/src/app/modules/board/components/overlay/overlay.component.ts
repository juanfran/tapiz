import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../../reducers/boardPage.reducer';

@Component({
  selector: 'tapiz-overlay',
  templateUrl: './overlay.component.html',
  styleUrls: ['./overlay.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.display]': 'hightlight() ? "block" : "none"',
  },
})
export class OverlayComponent {
  #store = inject(Store);
  hightlight = this.#store.selectSignal(boardPageFeature.isUserHighlighActive);
}
