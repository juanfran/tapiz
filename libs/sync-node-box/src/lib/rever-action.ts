import type { TuNode, StateActions } from '@tapiz/board-commons';

import { diff } from './diff.js';

export function reverseAction(
  nodes: TuNode[],
  action: StateActions,
): StateActions | null {
  let node;

  if (action.parent) {
    const parent = nodes.find((it) => it.id === action.parent);

    if (!parent) {
      return null;
    }

    node = (parent.children || []).find((node) => node.id === action.data.id);
  } else {
    node = nodes.find((node) => node.id === action.data.id);
  }

  if (node) {
    const currentPosition = nodes.findIndex((it) => it.id === action.data.id);

    if (action.op === 'patch') {
      const nodeDiff = diff(action.data, node);

      return {
        op: 'patch',
        parent: action.parent,
        data: {
          id: action.data.id,
          type: action.data.type,
          content: nodeDiff,
        },
        position: currentPosition,
      };
    } else if (action.op === 'remove' && node) {
      return {
        op: 'add',
        parent: action.parent,
        data: node,
        position: currentPosition,
      };
    }
  }

  return {
    op: 'remove',
    parent: action.parent,
    data: {
      id: action.data.id,
      type: action.data.type,
    },
  };
}
