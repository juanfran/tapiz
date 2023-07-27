import { BoardApiService } from '@/app/services/board-api.service';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, map, switchMap, tap } from 'rxjs';
import { HomeActions } from '../home.actions';
import { AuthService } from '@/app/services/auth.service';

export const createBoard$ = createEffect(
  (
    actions$ = inject(Actions),
    boardApiService = inject(BoardApiService),
    router = inject(Router)
  ) => {
    return actions$.pipe(
      ofType(HomeActions.createBoard),
      exhaustMap((action) => {
        return boardApiService.createBoard(action.name);
      }),
      tap((result) => {
        void router.navigate(['board', result.id]);
      })
    );
  },
  {
    functional: true,
    dispatch: false,
  }
);

export const deleteBoard$ = createEffect(
  (actions$ = inject(Actions), boardApiService = inject(BoardApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.removeBoard),
      exhaustMap((action) => {
        return boardApiService.removeBoard(action.id);
      })
    );
  },
  {
    functional: true,
    dispatch: false,
  }
);

export const leaveBoard$ = createEffect(
  (actions$ = inject(Actions), boardApiService = inject(BoardApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.leaveBoard),
      exhaustMap((action) => {
        return boardApiService.leaveBoard(action.id);
      })
    );
  },
  {
    functional: true,
    dispatch: false,
  }
);

export const duplicateBoard$ = createEffect(
  (actions$ = inject(Actions), boardApiService = inject(BoardApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.duplicateBoard),
      exhaustMap((action) => {
        return boardApiService.duplicateBoard(action.id);
      }),
      map(() => {
        return HomeActions.fetchBoards();
      })
    );
  },
  {
    functional: true,
  }
);

export const fetchBoards$ = createEffect(
  (actions$ = inject(Actions), boardApiService = inject(BoardApiService)) => {
    return actions$.pipe(
      ofType(HomeActions.fetchBoards),
      switchMap(() => {
        return boardApiService.fetchBoards().pipe(
          map((boards) => {
            return HomeActions.fetchBoardsSuccess({ boards });
          })
        );
      })
    );
  },
  {
    functional: true,
  }
);

export const removeAccount$ = createEffect(
  (
    actions$ = inject(Actions),
    boardApiService = inject(BoardApiService),
    authService = inject(AuthService)
  ) => {
    return actions$.pipe(
      ofType(HomeActions.removeAccount),
      switchMap(() => {
        return boardApiService.removeAccount().pipe(
          tap(() => {
            authService.logout();
          })
        );
      })
    );
  },
  {
    functional: true,
    dispatch: false,
  }
);
