import { Route } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { HomeComponent } from './home.component';
import * as homeEffects from './+state/effects/home.effects';
import { homeFeature } from './+state/home.feature';
import { makeEnvironmentProviders } from '@angular/core';

export const homesRoutes: Route[] = [
  {
    path: '',
    component: HomeComponent,
    providers: [
      makeEnvironmentProviders([
        provideState(homeFeature),
        provideEffects(homeEffects),
      ]),
    ],
  },
];
