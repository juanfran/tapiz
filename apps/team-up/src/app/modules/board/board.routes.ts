import { Route } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

import { BoardComponent } from './board/board.component';
import { pageFeature } from './reducers/page.reducer';
import { boardFeature } from './reducers/board.reducer';
import { BoardEffects } from './effects/board.effects';
import { HistoryEffects } from './effects/history.effects';
import { PageEffects } from './effects/page.effects';
import { DrawingHistoryEffects } from './effects/drawing-history.effects';

export const boardRoutes: Route[] = [
  {
    path: '',
    component: BoardComponent,
    providers: [
      provideState(pageFeature),
      provideState(boardFeature),
      provideEffects(
        BoardEffects,
        HistoryEffects,
        PageEffects,
        DrawingHistoryEffects
      ),
    ],
  },
];
