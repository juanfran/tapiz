import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, map, tap } from 'rxjs/operators';
import { BoardPageActions } from '../actions/board-page.actions';
import { StateActions } from '@tapiz/board-commons';
import { BoardFacade } from '../../../services/board-facade.service';
import { isInputField } from '@tapiz/cdk/utils/is-input-field';
import { BoardActions } from '../actions/board.actions';

@Injectable()
export class HistoryEffects {
  #boardFacade = inject(BoardFacade);
  #actions$ = inject(Actions);

  undo$ = createEffect(() => {
    return this.#actions$.pipe(
      ofType(BoardPageActions.undo),
      filter(() => {
        return !isInputField();
      }),
      map(() => {
        const actions = this.#boardFacade.undo();

        return BoardActions.batchNodeActions({
          history: false,
          actions,
        });
      }),
    );
  });

  redo$ = createEffect(() => {
    return this.#actions$.pipe(
      ofType(BoardPageActions.redo),
      filter(() => {
        return !isInputField();
      }),
      map(() => {
        const actions = this.#boardFacade.redo();
        return BoardActions.batchNodeActions({
          history: false,
          actions,
        });
      }),
    );
  });

  endDrag$ = createEffect(
    () => {
      return this.#actions$.pipe(
        ofType(BoardPageActions.endDragNode),
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
              position: node.initialIndex,
              op: 'patch',
            };
          }) as StateActions[];

          this.#boardFacade.patchHistory((history) => {
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

  snapShot$ = createEffect(
    () => {
      return this.#actions$.pipe(
        ofType(BoardPageActions.nodeSnapshot),
        tap((action) => {
          this.#boardFacade.patchHistory((history) => {
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
}
