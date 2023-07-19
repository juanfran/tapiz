/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entries } from 'type-fest';

import { type CommonState } from './models/common-state.model';
import type { Diff, DiffAdd, DiffEdit, DiffRemove } from './models/diff.model';
import type { NodeType, StateActions } from './models/node.model';
import { Point } from './models/point.model';
import { BoardCommonActions } from './board-common-actions';

export const getActionDiff = (
  action: StateActions,
  userId?: string
): Diff | null => {
  if (action.op === 'patch') {
    return {
      edit: {
        [action.data.type]: [action.data.node],
      },
    };
  } else if (action.op === 'add') {
    if (action.data.type === 'note') {
      return {
        add: {
          [action.data.type]: [
            {
              ...action.data.node,
              votes: 0,
              emojis: [],
              ownerId: userId ?? action.data.node.ownerId,
            },
          ],
        },
      };
    }

    return {
      add: {
        [action.data.type]: [
          {
            ...action.data.node,
          },
        ],
      },
    };
  } else if (action.op === 'remove') {
    return {
      remove: {
        [action.data.type]: [action.data.node.id],
      },
    };
  }

  return null;
};

export const getDiff = (actions: StateActions[], userId?: string): Diff[] => {
  return actions
    .map((action) => {
      return getActionDiff(action, userId);
    })
    .filter((it): it is Diff => it !== null);
};

export function applyDiff(diff: Diff, state: CommonState): CommonState {
  if (diff?.add) {
    const addEntries = Object.entries(diff.add) as Entries<DiffAdd>;

    for (const [key, value] of addEntries) {
      const stateKey = NodeState[key] as keyof CommonState;
      const stateElement = state[stateKey];

      if (value && stateElement) {
        state = {
          ...state,
          [stateKey]: [...stateElement, ...value],
        };
      }
    }
  }

  if (diff?.set) {
    const setEntries = Object.entries(diff.set) as Entries<DiffAdd>;

    for (const [key, value] of setEntries) {
      const stateKey = NodeState[key] as keyof CommonState;
      if (value && state[stateKey]) {
        state = {
          ...state,
          [stateKey]: [...value],
        };
      }
    }
  }

  if (diff?.remove) {
    const removeEntries = Object.entries(diff.remove) as Entries<DiffRemove>;

    for (const [key, value] of removeEntries) {
      const stateKey = NodeState[key] as keyof CommonState;
      const objs = state[stateKey] as { id: string }[];

      if (value && state[stateKey]) {
        state = {
          ...state,
          [stateKey]: objs.filter((it) => !value.includes(it.id)),
        };
      }
    }
  }

  if (diff?.edit) {
    const editEntries = Object.entries(diff.edit) as Entries<DiffEdit>;
    for (const [key, value] of editEntries) {
      const stateKey = NodeState[key] as keyof CommonState;

      if (value && state && state[stateKey]) {
        const newElements: unknown[] = [];

        state = {
          ...state,
          [stateKey]: [
            ...state[stateKey].map((it) => {
              const newValue = (value as any[]).find(
                (edit) => it.id == edit.id
              );

              if (newValue) {
                return {
                  ...it,
                  ...newValue,
                };
              }

              return it;
            }),
            ...newElements,
          ],
        };
      }
    }

    // move to the top
    if (diff?.edit.note) {
      const movedNotes = diff?.edit.note
        .filter((note) => note.position)
        .map((it) => it.id);

      const index = state.notes.findIndex((it) => movedNotes.includes(it.id));

      if (index !== -1) {
        state.notes.push(state.notes.splice(index, 1)[0]);
      }
    }

    if (diff?.edit.vector) {
      const movedVectors = diff?.edit.vector
        .filter((note) => note.position)
        .map((it) => it.id);

      const index = state.vectors.findIndex((it) =>
        movedVectors.includes(it.id)
      );

      if (index !== -1) {
        state.vectors.push(state.vectors.splice(index, 1)[0]);
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
