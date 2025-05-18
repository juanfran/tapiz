import { StateActions, TNode } from '@tapiz/board-commons';
import { SyncNodeBoxHistory } from './models.js';
import { applyAction } from './apply-action.js';
import { reverseAction } from './rever-action.js';

export function redo(
  nodes: TNode[],
  history: SyncNodeBoxHistory,
): [TNode[], SyncNodeBoxHistory, StateActions[]] {
  history = { ...history };

  const actions = history.future.shift();

  if (!actions) {
    return [nodes, history, []];
  }

  const pastActions = actions
    .map((it) => {
      return reverseAction(nodes, it);
    })
    .filter((it): it is StateActions => !!it);

  if (pastActions.length) {
    history.past.unshift(pastActions);
  }

  const newState = actions.reduce((state, action) => {
    if (action.parent) {
      return state.map((it) => {
        if (it.id === action.parent) {
          return {
            ...it,
            children: applyAction(it.children ?? [], action),
          };
        }

        return it;
      });
    }

    return applyAction(state, action);
  }, nodes);

  return [newState, history, actions];
}
