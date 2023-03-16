import { Injectable } from '@angular/core';
import { Actions, concatLatestFrom, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { filter, map, switchMap } from 'rxjs';
import { PageActions } from '../actions/page.actions';
import { selectCocomaterial } from '../selectors/page.selectors';
import { BoardApiService } from '../services/board-api.service';

@Injectable()
export class PageEffects {
  public initBoardCocomaterialTags$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.initBoard),
      concatLatestFrom(() => [this.store.select(selectCocomaterial)]),
      filter(([, cocomaterial]) => !cocomaterial.tags.length),
      switchMap(() => {
        return this.boardApiService.getCocomaterialTags().pipe(
          map((tags) => {
            return PageActions.fetchCocomaterialTagsSuccess({ tags });
          })
        );
      })
    );
  });

  public fetchCocomaterialVectos$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.fetchVectors),
      concatLatestFrom(() => [this.store.select(selectCocomaterial)]),
      switchMap(([{ tags }]) => {
        return this.boardApiService.getCocomaterialVectors(1, 60, tags).pipe(
          map((vectors) => {
            return PageActions.fetchVectorsSuccess({
              vectors,
              page: 1,
            });
          })
        );
      })
    );
  });

  public nextVectorsPage$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.nextVectorsPage),
      concatLatestFrom(() => [this.store.select(selectCocomaterial)]),
      switchMap(([{ tags }, cocomaterial]) => {
        return this.boardApiService
          .getCocomaterialVectors(cocomaterial.page + 1, 60, tags)
          .pipe(
            map((vectors) => {
              return PageActions.fetchVectorsSuccess({
                vectors,
                page: cocomaterial.page + 1,
              });
            })
          );
      })
    );
  });

  constructor(
    private actions$: Actions,
    private store: Store,
    private boardApiService: BoardApiService
  ) {}
}
