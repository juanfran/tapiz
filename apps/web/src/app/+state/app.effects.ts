import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { UserApiService } from '../services/user-api.service';
import { AppActions } from './app.actions';
import { EMPTY, exhaustMap, map, mergeMap, of } from 'rxjs';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { appFeature } from './app.reducer';
import { AuthService } from '../services/auth.service';
import { HomeActions } from '../modules/home/+state/home.actions';

export const logout$ = createEffect(
  (
    actions$ = inject(Actions),
    userApiService = inject(UserApiService),
    authService = inject(AuthService),
    router = inject(Router),
  ) => {
    return actions$.pipe(
      ofType(AppActions.logout),
      exhaustMap(() => {
        return userApiService.logout();
      }),
      map(() => {
        document.cookie = '';
        localStorage.removeItem('user');
        authService.removeLocalStoreUser();

        router.navigate(['/login']);

        return AppActions.setUser({ user: null });
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
        if (userId) {
          if (router.url.includes('/board')) {
            router.navigate(['/404']);
          } else if (router.url === '/') {
            router.navigate(['/login']);
          } else {
            router.navigate(['/']);
          }

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

export const fetchOnSetUser$ = createEffect(
  (actions$ = inject(Actions)) => {
    return actions$.pipe(
      ofType(AppActions.setUser, HomeActions.userEvent),
      map(() => {
        return AppActions.fetchNotifications({ offset: 0 });
      }),
    );
  },
  {
    functional: true,
  },
);

export const notifications$ = createEffect(
  (actions$ = inject(Actions), usersApiService = inject(UserApiService)) => {
    return actions$.pipe(
      ofType(AppActions.fetchNotifications),
      exhaustMap(({ offset }) => {
        return usersApiService.notifications(offset).pipe(
          map((notifications) => {
            return AppActions.fetchNotificationsSuccess({
              ...notifications,
              offset,
            });
          }),
        );
      }),
    );
  },
  {
    functional: true,
  },
);

export const clearNotifications$ = createEffect(
  (actions$ = inject(Actions), usersApiService = inject(UserApiService)) => {
    return actions$.pipe(
      ofType(AppActions.clearNotifications),
      exhaustMap(() => {
        return usersApiService.clearNotifications();
      }),
      map(() => {
        return AppActions.fetchNotifications({ offset: 0 });
      }),
    );
  },
  {
    functional: true,
  },
);
