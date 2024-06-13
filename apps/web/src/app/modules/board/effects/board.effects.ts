import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { WsService } from '../../ws/services/ws.service';
import { EMPTY, of } from 'rxjs';
import {
  map,
  mergeMap,
  switchMap,
  tap,
  catchError,
  filter,
  auditTime,
} from 'rxjs/operators';
import { BoardActions } from '../actions/board.actions';
import { PageActions } from '../actions/page.actions';
import { BoardApiService } from '../../../services/board-api.service';
import { Router } from '@angular/router';
import { NodeAdd, StateActions, TuNode } from '@tapiz/board-commons';
import { BoardFacade } from '../../../services/board-facade.service';
import { pageFeature } from '../reducers/page.reducer';
import { NodesActions } from '@tapiz/nodes/services/nodes-actions';
import { ConfigService } from '../../../services/config.service';

@Injectable()
export class BoardEffects {
  private router = inject(Router);
  private actions$ = inject(Actions);
  private wsService = inject(WsService);
  private boardApiService = inject(BoardApiService);
  private store = inject(Store);
  private boardFacade = inject(BoardFacade);
  private nodesActions = inject(NodesActions);
  private configService = inject(ConfigService);
  public initBoard$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(PageActions.initBoard),
        tap(() => {
          this.boardFacade.start();
        }),
      );
    },
    {
      dispatch: false,
    },
  );

  public batchNodeActions$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BoardActions.batchNodeActions),
        tap((batch) => {
          this.boardFacade.applyActions(batch.actions, batch.history);
          this.wsService.send(batch.actions);
        }),
      );
    },
    {
      dispatch: false,
    },
  );

  public batchNodeActionsDemo$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BoardActions.batchNodeActions),
        auditTime(500),
        concatLatestFrom(() => this.store.select(pageFeature.selectBoardId)),
        filter(() => !!this.configService.config.DEMO),
        tap(([, boardId]) => {
          localStorage.setItem(boardId, JSON.stringify(this.boardFacade.get()));
        }),
      );
    },
    {
      dispatch: false,
    },
  );

  public setState$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BoardActions.setState),
        tap(({ data }) => {
          this.boardFacade.applyActions(data);
        }),
      );
    },
    {
      dispatch: false,
    },
  );

  public updateBoardName$ = createEffect(
    () => {
      return this.actions$.pipe(ofType(BoardActions.setBoardName)).pipe(
        concatLatestFrom(() => this.store.select(pageFeature.selectBoardId)),
        mergeMap(([action, boardId]) => {
          return this.boardApiService.renameBoard(boardId, action.name);
        }),
      );
    },
    {
      dispatch: false,
    },
  );

  public pasteNodes$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.pasteNodes),
      map((action) => {
        const batchActions = this.nodesActions.bulkAdd(action.nodes);

        this.boardFacade.applyActions(batchActions, true);
        this.wsService.send(batchActions);

        return PageActions.pasteNodesSuccess({
          nodes: batchActions,
        });
      }),
    );
  });

  public refetchBoard$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.refetchBoard),
      concatLatestFrom(() => this.store.select(pageFeature.selectBoardId)),
      switchMap(([, boardId]) => {
        return this.boardApiService.getBoard(boardId).pipe(
          map((board) => {
            return PageActions.fetchBoardSuccess({
              name: board.name,
              isAdmin: board.isAdmin,
              isPublic: board.public,
              privateId: board.privateId,
            });
          }),
        );
      }),
    );
  });

  public joinBoard$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.joinBoard),
      filter(() => !this.configService.config.DEMO),
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
              privateId: board.privateId,
            });
          }),
          catchError((e) => {
            if (e.data.httpStatus !== 200) {
              return of(
                PageActions.boardNotFound({
                  id: action.boardId,
                }),
              );
            }

            return EMPTY;
          }),
        );
      }),
    );
  });

  public joinBoardDemo$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.joinBoard),
      filter(() => !!this.configService.config.DEMO),
      concatLatestFrom(() => this.store.select(pageFeature.selectBoardId)),
      map(([, boardId]) => {
        let board: TuNode<object, string>[] = [];

        const storeItem = localStorage.getItem(boardId) || '[]';

        try {
          board = JSON.parse(storeItem);
        } catch (e) {
          console.error(e);
        }

        const initStateActions: StateActions[] = [
          ...board.map((it) => {
            const add: NodeAdd = {
              data: it,
              op: 'add',
            };

            return add;
          }),
        ];

        this.boardFacade.applyActions(initStateActions);

        return PageActions.fetchBoardSuccess({
          name: 'Demo',
          isAdmin: true,
          isPublic: false,
          privateId: '',
        });
      }),
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
      }),
    );
  });

  public boardNotFound$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(PageActions.boardNotFound),
        tap(() => {
          this.router.navigate(['/404']);
        }),
      );
    },
    { dispatch: false },
  );
}
