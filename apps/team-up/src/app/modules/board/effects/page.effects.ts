import { Injectable } from '@angular/core';
import { Actions, concatLatestFrom, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  filter,
  map,
  switchMap,
  tap,
  throttleTime,
  withLatestFrom,
} from 'rxjs';
import { PageActions } from '../actions/page.actions';
import {
  selectBoardId,
  selectCocomaterial,
  selectUserId,
} from '../selectors/page.selectors';
import { BoardApiService } from '../../../services/board-api.service';
import { BoardActions } from '../actions/board.actions';
import { selectNoteFocus } from '../selectors/board.selectors';
import { Note } from '@team-up/board-commons';
import { pageFeature } from '../reducers/page.reducer';
import { filterNil } from '@/app/commons/operators/filter-nil';

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

  public cleanDrawing$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.cleanNoteDrawing),
      concatLatestFrom(() => [this.store.select(selectNoteFocus)]),
      map(([, note]) => note),
      filter((note): note is Note => !!note),
      map((note) => {
        return PageActions.setNoteDrawing({
          id: note.id,
          drawing: [],
        });
      })
    );
  });

  public setNoteDrawing$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.setNoteDrawing),
      map((action) => {
        return BoardActions.batchNodeActions({
          history: true,
          actions: [
            {
              data: {
                type: 'note',
                node: {
                  id: action.id,
                  drawing: action.drawing,
                },
              },
              op: 'patch',
            },
          ],
        });
      })
    );
  });

  public goToNote$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.goToNote),
      concatLatestFrom(() => [this.store.select(pageFeature.selectZoom)]),
      map(([{ note }, zoom]) => {
        const noteWidth = 300;

        const x =
          -note.position.x * zoom +
          document.body.clientWidth / 2 -
          (noteWidth / 2) * zoom;
        const y =
          -note.position.y * zoom +
          document.body.clientHeight / 2 -
          (noteWidth / 2) * zoom;

        return PageActions.setUserView({
          zoom,
          position: {
            x,
            y,
          },
        });
      })
    );
  });

  public goToNoteResetPopup$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.goToNote),
      map(() => {
        return PageActions.setPopupOpen({
          popup: '',
        });
      })
    );
  });

  public saveLastUserView$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(PageActions.setUserView),
        throttleTime(500),
        withLatestFrom(this.store.select(selectBoardId)),
        tap(([action, boardId]) => {
          localStorage.setItem(
            `lastUserView-${boardId}`,
            JSON.stringify({
              zoom: action.zoom,
              position: action.position,
            })
          );
        })
      );
    },
    { dispatch: false }
  );

  public restoreLastUserView$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.fetchBoardSuccess),
      withLatestFrom(this.store.select(selectBoardId)),
      map(([, boardId]) => {
        return localStorage.getItem(`lastUserView-${boardId}`);
      }),
      filterNil(),
      map((lastUserView) => {
        const { zoom, position } = JSON.parse(lastUserView);

        return PageActions.setUserView({
          zoom,
          position,
        });
      })
    );
  });

  constructor(
    private actions$: Actions,
    private store: Store,
    private boardApiService: BoardApiService
  ) {}
}
