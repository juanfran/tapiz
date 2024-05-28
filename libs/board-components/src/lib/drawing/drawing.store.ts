import { Injectable, inject } from '@angular/core';
import { Drawing, TuNode } from '@tapiz/board-commons';
import { rxState } from '@rx-angular/state';
import { BehaviorSubject, filter, map } from 'rxjs';
import { rxActions } from '@rx-angular/state/actions';
import { Store } from '@ngrx/store';
import { BoardActions } from '@tapiz/board-commons/actions/board.actions';
import { Action } from '@ngrx/store';
import { concatLatestFrom } from '@ngrx/effects';

interface DrawingState {
  undoable: { action: Action; inverseAction: Action }[];
  undone: { action: Action; inverseAction: Action }[];
  drawing: boolean;
  drawingColor: string;
  drawingSize: number;
}

const initialState: DrawingState = {
  undoable: [],
  undone: [],
  drawing: false,
  drawingColor: '#000000',
  drawingSize: 5,
};

@Injectable()
export class DrawingStore {
  #store = inject(Store);

  selectNode$ = new BehaviorSubject(undefined) as BehaviorSubject<
    TuNode[] | undefined
  >;

  nodes$ = new BehaviorSubject([] as TuNode<{ drawing: Drawing[] }>[]);
  actions = rxActions<{
    undoDrawing: void;
    redoDrawing: void;
    cleanDrawing: void;
    setDrawing: {
      id: string;
      type: string;
      drawing: Drawing[];
      history: boolean;
    };
    readyToDraw: void;
    finishDrawing: void;
    setDrawingParams: {
      color: string;
      size: number;
    };
  }>();

  #state = rxState<DrawingState>(({ set }) => {
    set(initialState);

    this.actions.undoDrawing$.subscribe(() => {
      const undoable = this.#state.get('undoable');
      const lastPatches = undoable.shift();

      if (lastPatches) {
        const undone = this.#state.get('undone');
        undone.unshift(lastPatches);
        this.#state.set({ undoable, undone });

        this.#store.dispatch(lastPatches.inverseAction);
      }
    });

    this.actions.redoDrawing$.subscribe(() => {
      const undone = this.#state.get('undone');
      const nextPatches = undone.shift();

      if (nextPatches) {
        const undoable = this.#state.get('undoable');
        undoable.unshift(nextPatches);
        this.#state.set({ undoable, undone });

        this.#store.dispatch(nextPatches.action);
      }
    });

    this.actions.cleanDrawing$.subscribe(() => {
      const nodes = this.selectNode$.value;
      const node = nodes?.at(0);

      if (node?.type === 'note' || node?.type === 'panel') {
        this.actions.setDrawing({
          id: node.id,
          type: node.type,
          drawing: [],
          history: true,
        });
      }
    });

    this.actions.readyToDraw$.subscribe(() => {
      this.#state.set({ drawing: true });
    });

    this.actions.finishDrawing$.subscribe(() => {
      this.#state.set({ drawing: false });
    });

    this.actions.setDrawingParams$.subscribe(({ color, size }) => {
      this.#state.set({ drawingColor: color, drawingSize: size });
    });

    this.actions.setDrawing$
      .pipe(
        filter((action) => action.history),
        concatLatestFrom(() => this.nodes$),
        map(([action, nodes]) => {
          return {
            id: action.id,
            drawing: action.drawing,
            type: action.type,
            node: nodes.find((node) => node.id === action.id),
          };
        }),
      )
      .subscribe(({ id, drawing, type, node }) => {
        if (!node) {
          return;
        }

        if (node.type === 'note' || node.type === 'panel') {
          this.#newUndoneAction(
            BoardActions.batchNodeActions({
              history: true,
              actions: [
                {
                  data: {
                    type,
                    id,
                    content: {
                      drawing,
                    },
                  },
                  op: 'patch',
                },
              ],
            }),
            BoardActions.batchNodeActions({
              history: false,
              actions: [
                {
                  data: {
                    type,
                    id,
                    content: {
                      drawing: node.content.drawing,
                    },
                  },
                  op: 'patch',
                },
              ],
            }),
          );
        }
      });

    this.actions.setDrawing$.subscribe(({ id, drawing, history }) => {
      this.#store.dispatch(
        BoardActions.batchNodeActions({
          history,
          actions: [
            {
              data: {
                type: 'note',
                id,
                content: {
                  drawing,
                },
              },
              op: 'patch',
            },
          ],
        }),
      );
    });
  });

  #newUndoneAction(action: Action, inverseAction: Action) {
    const undoable = this.#state.get('undoable');
    undoable.unshift({
      action,
      inverseAction,
    });
    this.#state.set({ undoable, undone: [] });
  }

  readonly color = this.#state.signal('drawingColor');
  readonly size = this.#state.signal('drawingSize');
  readonly drawing = this.#state.signal('drawing');
}
