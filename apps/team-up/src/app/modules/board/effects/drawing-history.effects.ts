import { Injectable, inject } from '@angular/core';
import { Actions, concatLatestFrom, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { EMPTY, of } from 'rxjs';
import { filter, mergeMap, tap } from 'rxjs/operators';
import { BoardActions } from '../actions/board.actions';
import { PageActions } from '../actions/page.actions';
import { selectNote } from '../selectors/board.selectors';

@Injectable()
export class DrawingHistoryEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);

  public history: {
    undoable: { action: Action; inverseAction: Action[] }[];
    undone: { action: Action; inverseAction: Action[] }[];
  } = {
    undoable: [],
    undone: [],
  };

  public undo$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(PageActions.undoDrawing),
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
      ofType(PageActions.redoDrawing),
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

  public setNoteDrawing$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(PageActions.setNoteDrawing),
        filter((action) => !action.history),
        concatLatestFrom((action) => this.store.select(selectNote(action.id))),
        tap(([action, note]) => {
          this.newUndoneAction(
            {
              ...action,
              history: true,
            } as Action,
            [
              BoardActions.batchNodeActions({
                history: false,
                actions: [
                  {
                    data: {
                      type: 'note',
                      node: {
                        id: action.id,
                        drawing: note?.drawing ?? [],
                      },
                    },
                    op: 'patch',
                  },
                ],
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
}
