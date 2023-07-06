/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entries } from 'type-fest';

import { CommonState } from './models/common-state.model';
import { Diff, DiffAdd, DiffEdit, DiffRemove } from './models/diff.model';

import { BoardCommonActions } from './board-common-actions';
import { NodeType } from './models/node.model';

// TODO: type safe
export const getDiff = (action: any, userId?: string): Diff | null => {
  if (action.type === BoardCommonActions.patchNode) {
    return {
      edit: {
        [action.nodeType]: [action.node],
      },
    };
  } else if (action.type === BoardCommonActions.addNode) {
    if (action.node.type === 'note') {
      return {
        add: {
          [action.nodeType]: [
            {
              ...action.node,
              votes: 0,
              emojis: [],
              ownerId: userId ?? action.node.ownerId,
            },
          ],
        },
      };
    }

    return {
      add: {
        [action.nodeType]: [
          {
            ...action.node,
          },
        ],
      },
    };
  } else if (action.type === BoardCommonActions.removeNode) {
    return {
      remove: {
        [action.nodeType]: [action.node.id],
      },
    };
  } else if (action.type === BoardCommonActions.moveCursor && userId) {
    return {
      edit: {
        user: [
          {
            id: userId,
            cursor: action.cursor,
          },
        ],
      },
    };
  } else if (action.type === BoardCommonActions.setVisible && userId) {
    return {
      edit: {
        user: [
          {
            id: userId,
            visible: !!action.visible,
          },
        ],
      },
    };
  }

  return null;
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
