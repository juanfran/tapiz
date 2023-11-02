import { StateActions, TuNode } from '@team-up/board-commons';
import { SyncNodeBoxHistory } from './models';
import { applyAction } from './apply-action';
import { reverseAction } from './rever-action';

export function redo(
  nodes: TuNode[],
  history: SyncNodeBoxHistory
): [TuNode[], SyncNodeBoxHistory, StateActions[]] {
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
