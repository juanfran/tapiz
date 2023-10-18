import type { TuNode, StateActions } from '@team-up/board-commons';

import { diff } from './diff';

export function reverseAction(
  nodes: TuNode[],
  action: StateActions
): StateActions {
  const node = nodes.find((node) => node.id === action.data.id);
  if (node) {
    if (action.op === 'patch') {
      const nodeDiff = diff(action.data, node);

      return {
        op: 'patch',
        data: {
          id: action.data.id,
          type: action.data.type,
          content: nodeDiff,
        },
      };
    } else if (action.op === 'remove' && node) {
      return {
        op: 'add',
        data: node,
      };
    }
  }

  return {
    op: 'remove',
    data: {
      id: action.data.id,
      type: action.data.type,
    },
  };
}
