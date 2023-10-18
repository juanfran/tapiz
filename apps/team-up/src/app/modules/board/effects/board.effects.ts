import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { WsService } from '@/app/modules/ws/services/ws.service';
import { EMPTY, of } from 'rxjs';
import {
  map,
  mergeMap,
  switchMap,
  tap,
  withLatestFrom,
  catchError,
  filter,
} from 'rxjs/operators';
import { v4 } from 'uuid';
import { BoardActions } from '../actions/board.actions';
import { PageActions } from '../actions/page.actions';
import { selectZone } from '../selectors/page.selectors';
import { BoardApiService } from '../../../services/board-api.service';
import { Router } from '@angular/router';
import { StateActions } from '@team-up/board-commons';
import { BoardFacade } from '@/app/services/board-facade.service';

@Injectable()
export class BoardEffects {
  public initBoard$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(PageActions.initBoard),
        tap(() => {
          this.boardFacade.start();
        })
      );
    },
    {
      dispatch: false,
    }
  );

  public batchNodeActions$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BoardActions.batchNodeActions),
        tap((batch) => {
          this.boardFacade.applyActions(batch.actions, batch.history);
          this.wsService.send(batch.actions);
        })
      );
    },
    {
      dispatch: false,
    }
  );

  public setState$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BoardActions.setState),
        tap(({ data }) => {
          this.boardFacade.applyActions(data);
        })
      );
    },
    {
      dispatch: false,
    }
  );

  public wsUpdateStateName$ = createEffect(
    () => {
      return this.actions$
        .pipe(ofType(BoardActions.setBoardName, BoardActions.setVisible))
        .pipe(
          tap((action) => {
            this.wsService.send([action]);
          })
        );
    },
    {
      dispatch: false,
    }
  );

  public pasteNodes$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(PageActions.pasteNodes),
        tap((action) => {
          const batchActions: StateActions[] = action.nodes.map((node) => {
            return {
              op: 'add',
              data: node,
            };
          });

          this.boardFacade.applyActions(batchActions, true);
          this.wsService.send(batchActions);
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
            this.wsService.send([
              {
                action: 'join',
                boardId: board.id,
              },
            ]);

            return PageActions.fetchBoardSuccess({
              name: board.name,
              isAdmin: board.isAdmin,
              isPublic: board.public,
            });
          }),
          catchError((e) => {
            if (e.data.httpStatus === 404 || e.data.httpStatus === 401) {
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
      ofType(BoardActions.batchNodeActions),
      filter((it) => {
        return (
          it.actions.length === 1 && !!it.history && it.actions[0].op === 'add'
        );
      }),
      map(({ actions }) => {
        if ('id' in actions[0].data) {
          return PageActions.setFocusId({ focusId: actions[0].data.id });
        }

        return { type: 'noop' };
      }),
      filter((it) => {
        return it.type !== 'noop';
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
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                {
                  data: {
                    type: 'group',
                    id: v4(),
                    content: {
                      title: '',
                      position: zone.position,
                      width: width,
                      height: height,
                      votes: [],
                    },
                  },
                  op: 'add',
                },
              ],
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
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                {
                  data: {
                    type: 'panel',
                    id: v4(),
                    content: {
                      title: '',
                      position: zone.position,
                      width: width,
                      height: height,
                    },
                  },
                  op: 'add',
                },
              ],
            })
          );
        }

        return EMPTY;
      })
    );
  });

  constructor(
    private router: Router,
    private actions$: Actions,
    private wsService: WsService,
    private boardApiService: BoardApiService,
    private store: Store,
    private boardFacade: BoardFacade
  ) {}
}
