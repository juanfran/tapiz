import { Injectable } from '@angular/core';
import {
  Actions,
  act,
  concatLatestFrom,
  createEffect,
  ofType,
} from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { WsService } from '@/app/modules/ws/services/ws.service';
import { EMPTY, of } from 'rxjs';
import { filter, mergeMap, tap } from 'rxjs/operators';
import { BoardActions } from '../actions/board.actions';
import { PageActions } from '../actions/page.actions';
import { AddNode, RemoveNode } from '@team-up/board-commons';
import { selectNote } from '../selectors/board.selectors';

@Injectable()
export class HistoryEffects {
  public history: {
    undoable: { action: Action; inverseAction: Action }[];
    undone: { action: Action; inverseAction: Action }[];
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

          return of(lastPatches.inverseAction);
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

  public newNote$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BoardActions.addNode),
        filter((action) => !action.history),
        tap((action) => {
          this.newUndoneAction(
            action,
            BoardActions.removeNode({
              node: action.node,
              nodeType: action.nodeType,
              history: true,
            } as RemoveNode)
          );
        })
      );
    },
    {
      dispatch: false,
    }
  );

  public removeNote$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BoardActions.removeNode),
        filter((action) => !action.history),
        tap((action) => {
          this.newUndoneAction(
            action,
            BoardActions.addNode({
              node: action.node,
              nodeType: action.nodeType,
              history: true,
            } as AddNode)
          );
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
        tap((action) => {
          this.newUndoneAction(
            BoardActions.patchNode({
              node: {
                id: action.id,
                position: action.finalPosition,
              },
              nodeType: action.nodeType,
            }),
            BoardActions.patchNode({
              node: {
                id: action.id,
                position: action.initialPosition,
              },
              nodeType: action.nodeType,
            })
          );
        })
      );
    },
    {
      dispatch: false,
    }
  );

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
            BoardActions.patchNode({
              nodeType: 'note',
              node: {
                id: action.id,
                drawing: note?.drawing ?? [],
              },
            })
          );
        })
      );
    },
    {
      dispatch: false,
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public newUndoneAction(action: Action, inverseAction: Action) {
    this.history.undoable.unshift({
      action,
      inverseAction,
    });
    this.history.undone = [];
  }

  constructor(private actions$: Actions, private store: Store) {}
}
