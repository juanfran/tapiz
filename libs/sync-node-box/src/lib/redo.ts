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

  const pastActions = actions.map((it) => {
    return reverseAction(nodes, it);
  });

  history.past.unshift(pastActions);

  const newState = actions.reduce((state, action) => {
    return applyAction(state, action);
  }, nodes);

  return [newState, history, actions];
}
