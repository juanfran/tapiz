import { Route } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { HomeComponent } from './home.component';
import * as homeEffects from './+state/effects/home.effects';
import { homeFeature } from './+state/home.feature';
import { AllBoardsComponent } from './components/all-boards/all-boards.component';
import { TeamComponent } from './components/team/team.component';
import { StarredComponent } from './components/starred/starred.component';

export const homesRoutes: Route[] = [
  {
    path: '',
    component: HomeComponent,
    providers: [provideState(homeFeature), provideEffects(homeEffects)],
    children: [
      {
        path: 'team/:teamId',
        component: TeamComponent,
      },
      {
        path: 'starred',
        component: StarredComponent,
      },
      {
        path: '',
        component: AllBoardsComponent,
      },
    ],
  },
];
