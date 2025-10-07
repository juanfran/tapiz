import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import type { ArrowNode } from '@tapiz/board-commons/models/arrow.model';
import { Store } from '@ngrx/store';
import { boardPageFeature } from '../../../reducers/boardPage.reducer';
import { BoardFacade } from '../../../../../services/board-facade.service';
import { v4 } from 'uuid';

@Component({
  selector: 'tapiz-arrow-toolbar',
  template: `
    <div class="wrapper">
      <p><button (click)="onTestClick()">test</button></p>
    </div>
  `,
  styleUrl: './arrow-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class ArrowToolbarComponent {
  #store = inject(Store);
  #popupOpen = this.#store.selectSignal(boardPageFeature.selectPopupOpen);
  #boardFacade = inject(BoardFacade);
  open = computed(() => {
    console.log('open', this.#popupOpen() === 'arrow');
    return this.#popupOpen() === 'arrow';
  });

  onTestClick() {
    const arrow: ArrowNode = {
      color: 'black',
      strokeStyle: 'solid',
      arrowType: 'sharp',
      start: { x: 100, y: 100 },
      end: { x: 200, y: 200 },
      layer: 0,
      position: { x: 100, y: 100 },
    };

    this.#boardFacade.tmpNode.set({
      type: 'arrow',
      id: v4(),
      content: arrow,
    });
  }
}
