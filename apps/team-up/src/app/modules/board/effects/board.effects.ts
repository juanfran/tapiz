import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { WsService } from '@/app/modules/ws/services/ws.service';
import { EMPTY, of } from 'rxjs';
import {
  exhaustMap,
  map,
  mergeMap,
  switchMap,
  tap,
  withLatestFrom,
  filter,
} from 'rxjs/operators';
import { v4 } from 'uuid';
import {
  joinBoard,
  moveCursor,
  setFocusId,
  setVisible,
  zoneToGroup,
  setMoveEnabled,
  zoneToPanel,
  createBoard,
  fetchBoards,
  fetchBoardsSuccess,
  setPopupOpen,
  changeCanvasMode,
  setBoardName,
  patchNode,
  addNode,
  removeNode,
  fetchBoardSuccess,
  removeBoard,
} from '../actions/board.actions';
import { selectZone } from '../selectors/board.selectors';
import { BoardApiService } from '../services/board-api.service';
import { Router } from '@angular/router';
@Injectable()
export class BoardEffects {
  public wsUpdateState$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(
          addNode,
          patchNode,
          removeNode,
          moveCursor,
          setVisible,
          setBoardName
        ),
        tap((action) => {
          this.wsService.send(action);
        })
      );
    },
    {
      dispatch: false,
    }
  );

  public joinBoard$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(joinBoard),
      switchMap((action) => {
        return this.boardApiService.getBoard(action.boardId);
      }),
      map((board) => {
        this.wsService.send({
          action: 'join',
          boardId: board.id,
        });

        return fetchBoardSuccess({
          name: board.name,
          owners: board.owners,
        });
      })
    );
  });

  public addNode$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(addNode),
      filter((action) => !action.history),
      map(({ node }) => {
        return setFocusId({ focusId: node.id });
      })
    );
  });

  public resetPopupOnChangeMode$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(changeCanvasMode),
      map(() => setPopupOpen({ popup: '' }))
    );
  });

  public moveEnabledOnChangeMode$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(changeCanvasMode),
      map(() => setMoveEnabled({ enabled: true }))
    );
  });

  public zoneToGroup$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(zoneToGroup),
      withLatestFrom(this.store.select(selectZone)),
      mergeMap(([, zone]) => {
        if (zone) {
          let { width, height } = zone;

          if (width < 2) {
            width = 300;
            height = 300;
          }

          return of(
            addNode({
              nodeType: 'group',
              node: {
                id: v4(),
                title: '',
                position: zone.position,
                width: width,
                height: height,
              },
            })
          );
        }

        return EMPTY;
      })
    );
  });

  public zoneToPanel$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(zoneToPanel),
      withLatestFrom(this.store.select(selectZone)),
      mergeMap(([, zone]) => {
        if (zone) {
          let { width, height } = zone;

          if (width < 2) {
            width = 300;
            height = 300;
          }

          return of(
            addNode({
              nodeType: 'panel',
              node: {
                id: v4(),
                title: '',
                position: zone.position,
                width: width,
                height: height,
                color: '#fdfcdc',
              },
            })
          );
        }

        return EMPTY;
      })
    );
  });

  public createBoard$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(createBoard),
        exhaustMap((action) => {
          return this.boardApiService.createBoard(action.name);
        }),
        tap((result) => {
          void this.router.navigate(['board', result.id]);
        })
      );
    },
    {
      dispatch: false,
    }
  );

  public deleteBoard$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(removeBoard),
        exhaustMap((action) => {
          return this.boardApiService.removeBoard(action.id);
        })
      );
    },
    {
      dispatch: false,
    }
  );

  public fetchBoards$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fetchBoards),
      switchMap(() => {
        return this.boardApiService.fetchBoards().pipe(
          map((boards) => {
            return fetchBoardsSuccess({ boards });
          })
        );
      })
    );
  });

  constructor(
    private router: Router,
    private actions$: Actions,
    private wsService: WsService,
    private boardApiService: BoardApiService,
    private store: Store
  ) {}
}
