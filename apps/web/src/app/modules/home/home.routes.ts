import { Route } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { HomeComponent } from './home.component';
import * as homeEffects from './+state/effects/home.effects';
import { homeFeature } from './+state/home.feature';
import { AllBoardsComponent } from './components/all-boards/all-boards.component';
import { TeamComponent } from './components/team/team.component';

export const homesRoutes: Route[] = [
  {
    path: '',
    component: HomeComponent,
    providers: [provideState(homeFeature), provideEffects(homeEffects)],
    children: [
      {
        path: 'team/:id',
        component: TeamComponent,
      },
      {
        path: 'starred',
        loadComponent: () =>
          import('./components/starred/starred.component').then(
            (m) => m.StarredComponent,
          ),
      },
      {
        path: '',
        component: AllBoardsComponent,
      },
    ],
  },
];
