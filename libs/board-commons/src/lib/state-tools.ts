/* eslint-disable @typescript-eslint/no-explicit-any */

import { type CommonState } from './models/common-state.model';
import type { NodeType, StateActions } from './models/node.model';
import { Point } from './models/point.model';
import { BoardCommonActions } from './board-common-actions';
import { User } from './models/user.model';

export function applyDiff(
  action: StateActions,
  state: CommonState
): CommonState {
  if (action.data.type === 'user') {
    if (state.users) {
      if (action.op === 'add') {
        state = {
          ...state,
          users: [...state.users, action.data.content as User],
        };
      } else if (action.op === 'remove') {
        state = {
          ...state,
          users: state.users.filter((it) => action.data.id !== it.id),
        };
      } else if (action.op === 'patch') {
        state = {
          ...state,
          users: [
            ...state.users.map((it) => {
              if (action.data.id === it.id) {
                return {
                  ...it,
                  ...action.data.content,
                };
              }
              return it;
            }),
          ],
        };
      }

      return state;
    }
  }

  const stateElement = state.nodes;

  if (action.op === 'add') {
    const value = action.data;

    if (value) {
      state = {
        ...state,
        nodes: [...stateElement, value],
      };
    }
  } else if (action.op === 'remove') {
    state = {
      ...state,
      nodes: state.nodes.filter((it) => action.data.id !== it.id),
    };
  } else if (action.op === 'patch') {
    state = {
      ...state,
      nodes: [
        ...state.nodes.map((it) => {
          if (action.data.id === it.id) {
            return {
              ...it,
              content: {
                ...it.content,
                ...action.data.content,
              },
            };
          }
          return it;
        }),
      ],
    };
  }

  // move to the top
  if (action.data.type === 'note' || action.data.type === 'vector') {
    const index = state.nodes.findIndex((it) => action.data.id === it.id);

    if (index !== -1) {
      state.nodes.push(state.nodes.splice(index, 1)[0]);
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
      key = `${action.op}-${action.data.type}-${action.data.id}`;
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
