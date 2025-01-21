import { Route } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

import { BoardComponent } from './board/board.component';
import { boardPageFeature } from './reducers/boardPage.reducer';
import { BoardEffects } from './effects/board.effects';
import { HistoryEffects } from './effects/history.effects';
import { BoardPageEffects } from './effects/board-page.effects';

export const boardRoutes: Route[] = [
  {
    path: '',
    component: BoardComponent,
    providers: [
      provideState(boardPageFeature),
      provideEffects(BoardEffects, HistoryEffects, BoardPageEffects),
    ],
  },
];
