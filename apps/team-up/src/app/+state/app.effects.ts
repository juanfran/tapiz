import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { UserApiService } from '../services/user-api.service';
import { AppActions } from './app.actions';
import { exhaustMap, map } from 'rxjs';
import { Router } from '@angular/router';

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
