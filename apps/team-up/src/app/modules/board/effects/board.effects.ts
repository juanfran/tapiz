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
  catchError,
} from 'rxjs/operators';
import { v4 } from 'uuid';
import { BoardActions } from '../actions/board.actions';
import { PageActions } from '../actions/page.actions';
import { selectZone } from '../selectors/page.selectors';
import { BoardApiService } from '../services/board-api.service';
import { Router } from '@angular/router';

@Injectable()
export class BoardEffects {
  public wsUpdateState$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(
          BoardActions.addNode,
          BoardActions.patchNode,
          BoardActions.removeNode,
          BoardActions.moveCursor,
          BoardActions.setVisible,
          BoardActions.setBoardName
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
      ofType(PageActions.joinBoard),
      switchMap((action) => {
        return this.boardApiService.getBoard(action.boardId).pipe(
          map((board) => {
            this.wsService.send({
              action: 'join',
              boardId: board.id,
            });

            return PageActions.fetchBoardSuccess({
              name: board.name,
              owners: board.owners,
            });
          }),
          catchError((e) => {
            if (e.status === 404) {
              return of(
                PageActions.boardNotFound({
                  id: action.boardId,
                })
              );
            }

            return EMPTY;
          })
        );
      })
    );
  });

  public addNode$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BoardActions.addNode),
      filter((action) => !action.history),
      map(({ node }) => {
        return PageActions.setFocusId({ focusId: node.id });
      })
    );
  });

  public boardNotFound$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(PageActions.boardNotFound),
        tap(() => {
          this.router.navigate(['/404']);
        })
      );
    },
    { dispatch: false }
  );

  public resetPopupOnChangeMode$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.changeCanvasMode),
      map(() => PageActions.setPopupOpen({ popup: '' }))
    );
  });

  public moveEnabledOnChangeMode$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.changeCanvasMode),
      map(() => PageActions.setMoveEnabled({ enabled: true }))
    );
  });

  public zoneToGroup$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.zoneToGroup),
      withLatestFrom(this.store.select(selectZone)),
      mergeMap(([, zone]) => {
        if (zone) {
          let { width, height } = zone;

          if (width < 2) {
            width = 300;
            height = 300;
          }

          return of(
            BoardActions.addNode({
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
      ofType(PageActions.zoneToPanel),
      withLatestFrom(this.store.select(selectZone)),
      mergeMap(([, zone]) => {
        if (zone) {
          let { width, height } = zone;

          if (width < 2) {
            width = 300;
            height = 300;
          }

          return of(
            BoardActions.addNode({
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
        ofType(PageActions.createBoard),
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
        ofType(PageActions.removeBoard),
        exhaustMap((action) => {
          return this.boardApiService.removeBoard(action.id);
        })
      );
    },
    {
      dispatch: false,
    }
  );

  public leaveBoard$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(PageActions.leaveBoard),
        exhaustMap((action) => {
          return this.boardApiService.leaveBoard(action.id);
        })
      );
    },
    {
      dispatch: false,
    }
  );

  public fetchBoards$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.fetchBoards),
      switchMap(() => {
        return this.boardApiService.fetchBoards().pipe(
          map((boards) => {
            return PageActions.fetchBoardsSuccess({ boards });
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
