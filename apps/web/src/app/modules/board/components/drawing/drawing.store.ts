import { Injectable, computed, inject } from '@angular/core';
import { Drawing, isNote, isPanel, TuNode } from '@tapiz/board-commons';
import { Store } from '@ngrx/store';
import { BoardActions } from '@tapiz/board-commons/actions/board.actions';
import { Action } from '@ngrx/store';
import { BoardFacade } from '../../../../services/board-facade.service';
import { BoardPageActions } from '../../actions/board-page.actions';
import { patchState, signalState } from '@ngrx/signals';
import { explicitEffect } from 'ngxtension/explicit-effect';

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
  #boardFacade = inject(BoardFacade);

  nodes = computed(() => {
    return this.#boardFacade
      .nodes()
      .filter((node) => isNote(node) || isPanel(node)) satisfies TuNode<{
      drawing: Drawing[];
    }>[];
  });

  state = signalState<DrawingState>(initialState);

  #newUndoneAction(action: Action, inverseAction: Action) {
    const undoable = [...this.state.undoable()];
    undoable.unshift({
      action,
      inverseAction,
    });

    patchState(this.state, () => {
      return { undoable, undone: [] };
    });
  }

  readonly color = this.state.drawingColor;
  readonly size = this.state.drawingSize;
  readonly drawing = this.state.drawing;

  constructor() {
    explicitEffect([this.state.drawing], ([drawing]) => {
      this.#store.dispatch(
        BoardPageActions.setDragEnabled({
          dragEnabled: !drawing,
        }),
      );
    });
  }

  undoDrawing() {
    const undoable = [...this.state.undoable()];
    const lastPatches = undoable.shift();

    if (lastPatches) {
      const undone = [...this.state.undone()];
      undone.unshift(lastPatches);

      patchState(this.state, () => {
        return { undoable, undone };
      });

      this.#store.dispatch(lastPatches.inverseAction);
    }
  }

  redoDrawing() {
    const undone = [...this.state.undone()];
    const nextPatches = undone.shift();

    if (nextPatches) {
      const undoable = [...this.state.undoable()];
      undoable.unshift(nextPatches);
      patchState(this.state, () => {
        return { undoable, undone };
      });

      this.#store.dispatch(nextPatches.action);
    }
  }

  cleanDrawing() {
    const nodes = this.#boardFacade.focusNodes();
    const node = nodes?.at(0);

    if (node?.type === 'note' || node?.type === 'panel') {
      this.setDrawing(node.id, node.type, [], true);
    }
  }

  readyToDraw() {
    patchState(this.state, () => {
      return { drawing: true };
    });
  }

  finishDrawing() {
    patchState(this.state, () => {
      return { drawing: false };
    });
  }

  setDrawingParams(color: string, size: number) {
    patchState(this.state, () => {
      return { drawingColor: color, drawingSize: size };
    });
  }

  setDrawing(id: string, type: string, drawing: Drawing[], history = true) {
    const nodes = this.nodes();
    const node = nodes.find((node) => node.id === id);

    if (!node) {
      return;
    }

    if (history) {
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
  }
}
