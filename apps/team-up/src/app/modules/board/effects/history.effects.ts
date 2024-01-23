import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, tap } from 'rxjs/operators';
import { BoardActions } from '../actions/board.actions';
import { PageActions } from '../actions/page.actions';
import { StateActions } from '@team-up/board-commons';
import { BoardFacade } from '../../../services/board-facade.service';
import { WsService } from '../../ws/services/ws.service';

@Injectable()
export class HistoryEffects {
  private boardFacade = inject(BoardFacade);
  private wsService = inject(WsService);

  public undo$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.undo),
      map(() => {
        const actions = this.boardFacade.undo();

        return BoardActions.batchNodeActions({
          history: false,
          actions,
        });
      }),
    );
  });

  public redo$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.redo),
      map(() => {
        const actions = this.boardFacade.redo();

        return BoardActions.batchNodeActions({
          history: false,
          actions,
        });
      }),
    );
  });

  public endDrag$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(PageActions.endDragNode),
        tap((actions) => {
          const nodesActions = actions.nodes.map((node) => {
            return {
              data: {
                type: node.nodeType,
                id: node.id,
                content: {
                  position: node.initialPosition,
                },
              },
              op: 'patch',
            };
          }) as StateActions[];

          this.boardFacade.patchHistory((history) => {
            history.past.unshift(nodesActions);
            history.future = [];

            return history;
          });
        }),
      );
    },
    {
      dispatch: false,
    },
  );

  public snapShot$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(PageActions.nodeSnapshot),
        tap((action) => {
          this.boardFacade.patchHistory((history) => {
            history.past.unshift([
              {
                data: {
                  type: action.prev.type,
                  id: action.prev.id,
                  content: action.prev.content,
                },
                op: 'patch',
              } as StateActions,
            ]);
            history.future = [];

            return history;
          });
        }),
      );
    },
    {
      dispatch: false,
    },
  );

  constructor(private actions$: Actions) {}
}
