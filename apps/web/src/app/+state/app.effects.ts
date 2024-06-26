import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { UserApiService } from '../services/user-api.service';
import { AppActions } from './app.actions';
import { EMPTY, exhaustMap, map, mergeMap, of } from 'rxjs';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { appFeature } from './app.reducer';

export const logout$ = createEffect(
  (
    actions$ = inject(Actions),
    userApiService = inject(UserApiService),
    router = inject(Router),
  ) => {
    return actions$.pipe(
      ofType(AppActions.logout),
      exhaustMap(() => {
        return userApiService.logout();
      }),
      map(() => {
        document.cookie = '';
        localStorage.removeItem('userId');
        router.navigate(['/login']);

        return AppActions.setUserId({ userId: '' });
      }),
    );
  },
  {
    functional: true,
  },
);

export const unauthorized$ = createEffect(
  (
    actions$ = inject(Actions),
    router = inject(Router),
    store = inject(Store),
  ) => {
    return actions$.pipe(
      ofType(AppActions.unauthorized),
      concatLatestFrom(() => store.select(appFeature.selectUserId)),
      mergeMap((userId) => {
        if (userId && router.url.includes('/board')) {
          router.navigate(['/404']);

          return EMPTY;
        }
        return of(AppActions.logout());
      }),
    );
  },
  {
    functional: true,
  },
);
