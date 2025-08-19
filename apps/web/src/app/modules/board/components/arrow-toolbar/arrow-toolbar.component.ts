import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import { Store } from '@ngrx/store';
import { boardPageFeature } from '../../reducers/boardPage.reducer';

@Component({
  selector: 'tapiz-arrow-toolbar',
  template: ` @if (open()) {
    <div class="wrapper">
      <p>test</p>
    </div>
  }`,
  styleUrl: './arrow-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class ArrowToolbarComponent {
  #store = inject(Store);
  #popupOpen = this.#store.selectSignal(boardPageFeature.selectPopupOpen);
  open = computed(() => {
    console.log('open', this.#popupOpen() === 'arrow');
    return this.#popupOpen() === 'arrow';
  });
}
