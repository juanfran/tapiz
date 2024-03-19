import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { TuNode } from '@team-up/board-commons';

type NodeState = {
  node: TuNode | null;
  focus: boolean;
  pasted: boolean;
  highlight: boolean;
};

const initialState: NodeState = {
  node: null,
  focus: false,
  pasted: false,
  highlight: false,
};

export const NodeStore = signalStore(
  withState(initialState),
  withMethods((store) => ({
    updateState: (state: Partial<NodeState>) => {
      patchState(store, state);
    },
  })),
);
