import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { EMPTY, of } from 'rxjs';
import { filter, mergeMap, tap } from 'rxjs/operators';
import { BoardActions } from '../actions/board.actions';
import { PageActions } from '../actions/page.actions';
import { StateActions } from '@team-up/board-commons';

@Injectable()
export class HistoryEffects {
  public history: {
    undoable: { action: Action; inverseAction: Action[] }[];
    undone: { action: Action; inverseAction: Action[] }[];
  } = {
    undoable: [],
    undone: [],
  };

  public undo$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.undo),
      mergeMap(() => {
        const lastPatches = this.history.undoable.shift();

        if (lastPatches) {
          this.history.undone.unshift(lastPatches);

          return of(...lastPatches.inverseAction);
        }

        return EMPTY;
      })
    );
  });

  public redo$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.redo),
      mergeMap(() => {
        const nextPatches = this.history.undone.shift();

        if (nextPatches) {
          this.history.undoable.unshift(nextPatches);

          return of(nextPatches.action);
        }

        return EMPTY;
      })
    );
  });

  public newNode$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BoardActions.batchNodeActions),
        filter((action) => {
          return !!action.history;
        }),
        tap((action) => {
          const addActions = action.actions.filter((it) => {
            return it.op === 'add';
          });

          const removeActions = addActions.map((it) => {
            return {
              op: 'remove',
              data: {
                type: it.data.type,
                id: it.data.id,
              },
            };
          }) as StateActions[];

          if (removeActions.length) {
            this.newUndoneAction(action, [
              BoardActions.batchNodeActions({
                history: false,
                actions: removeActions,
              }),
            ]);
          }
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
          const removeActions = action.nodes.map((it) => {
            return {
              op: 'remove',
              data: {
                type: it.type,
                id: it.id,
              },
            };
          }) as StateActions[];

          if (removeActions.length) {
            this.newUndoneAction(action, [
              BoardActions.batchNodeActions({
                history: false,
                actions: removeActions,
              }),
            ]);
          }
        })
      );
    },
    {
      dispatch: false,
    }
  );

  public removeNode$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BoardActions.batchNodeActions),
        filter((action) => {
          return !!action.history;
        }),
        tap((action) => {
          const removeActions = action.actions.filter((it) => {
            return it.op === 'remove';
          });

          const addActions = removeActions.map((it) => {
            return {
              op: 'add',
              data: it.data,
            };
          }) as StateActions[];

          if (addActions.length) {
            this.newUndoneAction(action, [
              BoardActions.batchNodeActions({
                history: false,
                actions: addActions,
              }),
            ]);
          }
        })
      );
    },
    {
      dispatch: false,
    }
  );

  public initDrag$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(PageActions.endDragNode),
        tap((actions) => {
          this.newUndoneAction(
            BoardActions.batchNodeActions({
              history: false,
              actions: actions.nodes.map((node) => {
                return {
                  data: {
                    type: node.nodeType,
                    id: node.id,
                    content: {
                      position: node.finalPosition,
                    },
                  },
                  op: 'patch',
                };
              }),
            }),
            [
              BoardActions.batchNodeActions({
                history: false,
                actions: actions.nodes.map((node) => {
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
                }),
              }),
            ]
          );
        })
      );
    },
    {
      dispatch: false,
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public newUndoneAction(action: Action, inverseAction: Action[]) {
    this.history.undoable.unshift({
      action,
      inverseAction,
    });
    this.history.undone = [];
  }

  constructor(private actions$: Actions, private store: Store) {}
}
