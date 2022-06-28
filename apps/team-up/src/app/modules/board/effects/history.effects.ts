import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { WsService } from '@/app/modules/ws/services/ws.service';
import { EMPTY, of } from 'rxjs';
import { filter, mergeMap, tap } from 'rxjs/operators';
import {
  undo,
  redo,
  patchNode,
  endDragNode,
  addNode,
  removeNode,
} from '../actions/board.actions';
import { HistoryService } from '../services/history.service';
import { AddNode, RemoveNode } from '@team-up/board-commons';

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
      ofType(undo),
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
      ofType(redo),
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
        ofType(addNode),
        filter((action) => !action.history),
        tap((action) => {
          this.newUndoneAction(
            action,
            removeNode({ node: action.node, nodeType: action.nodeType, history: true } as RemoveNode)
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
        ofType(removeNode),
        filter((action) => !action.history),
        tap((action) => {
          this.newUndoneAction(
            action,
            addNode({ node: action.node, nodeType: action.nodeType, history: true } as AddNode)
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
        ofType(endDragNode),
        tap((action) => {
          this.newUndoneAction(
            patchNode({
              node: {
                id: action.id,
                position: action.finalPosition,
              },
              nodeType: action.nodeType,
            }),
            patchNode({
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public newUndoneAction(action: Action, inverseAction: Action) {
    this.history.undoable.unshift({
      action,
      inverseAction,
    });
    this.history.undone = [];
  }

  constructor(
    private actions$: Actions,
    private wsService: WsService,
    private historyService: HistoryService,
    private store: Store
  ) {}
}
