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
  selector: 'tapiz-arrows-wrapper',
  template: ` <div class="wrapper"></div> `,
  styleUrl: './arrows-wrapper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class ArrowsWrapperComponent {
  #store = inject(Store);

  #boardFacade = inject(BoardFacade);
}
