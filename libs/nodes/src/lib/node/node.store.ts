import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { TuNode } from '@tapiz/board-commons';

type NodeState = {
  node: TuNode | null;
  focus: boolean;
  pasted: boolean;
  highlight: boolean;
  layer: number;
};

const initialState: NodeState = {
  node: null,
  focus: false,
  pasted: false,
  highlight: false,
  layer: 0,
};

export const NodeStore = signalStore(
  withState(initialState),
  withMethods((store) => ({
    updateState: (state: Partial<NodeState>) => {
      patchState(store, state);
    },
  })),
);
