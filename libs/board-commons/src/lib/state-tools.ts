/* eslint-disable @typescript-eslint/no-explicit-any */

import { type CommonState } from './models/common-state.model';
import type { NodeType, StateActions } from './models/node.model';
import { Point } from './models/point.model';
import { BoardCommonActions } from './board-common-actions';

export function applyDiff(
  action: StateActions,
  state: CommonState
): CommonState {
  const stateKey = NodeState[action.data.type] as keyof CommonState;
  const value = action.data.node;

  if (action.op === 'add') {
    const stateElement = state[stateKey];
    const value = action.data.node;

    if (value && stateElement) {
      state = {
        ...state,
        [stateKey]: [...stateElement, value],
      };
    }
  }

  if (action.op === 'remove') {
    const objs = state[stateKey] as { id: string }[];

    if (value && state[stateKey]) {
      state = {
        ...state,
        [stateKey]: objs.filter((it) => value.id !== it.id),
      };
    }
  }

  if (action.op === 'patch') {
    if (value && state && state[stateKey]) {
      const newElements: unknown[] = [];

      state = {
        ...state,
        [stateKey]: [
          ...state[stateKey].map((it) => {
            if (value.id === it.id) {
              return {
                ...it,
                ...value,
              };
            }

            return it;
          }),
          ...newElements,
        ],
      };
    }

    // move to the top
    if (action.data.type === 'note' || action.data.type === 'vector') {
      const index = state.notes.findIndex((it) => value.id === it.id);

      if (index !== -1) {
        state.notes.push(state.notes.splice(index, 1)[0]);
      }
    }
  }

  return {
    ...state,
  };
}

/* group patchs over the same object, example moving mouse */
export function optimize(actions: StateActions[] | unknown[]) {
  const isStateAction = (action: any): action is StateActions => {
    return 'op' in action && 'data' in action;
  };

  const isMouseMoveAction = (
    action: any
  ): action is { type: string; position: Point; cursor: Point } => {
    return action.type === BoardCommonActions.moveUser;
  };

  const optimizedTmp: Record<string, any> = {};
  const notOptimized: unknown[] = [];

  let key = '';

  actions.forEach((action) => {
    if (isMouseMoveAction(action)) {
      key = 'mouse-move';
    } else if (!isStateAction(action)) {
      notOptimized.push(action);
      return;
    } else {
      key = `${action.op}-${action.data.type}-${action.data.node.id}`;
    }

    if (!optimizedTmp[key]) {
      optimizedTmp[key] = action;
    } else {
      optimizedTmp[key] = {
        ...optimizedTmp[key],
        ...action,
      };
    }
  });

  return [...notOptimized, ...Object.values(optimizedTmp)];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const NodeState: Record<NodeType | 'user', string> = {
  note: 'notes',
  group: 'groups',
  image: 'images',
  text: 'texts',
  panel: 'panels',
  user: 'users',
  vector: 'vectors',
};
