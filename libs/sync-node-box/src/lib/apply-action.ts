import type { TuNode, StateActions } from '@tapiz/board-commons';
import { arrayMove } from '@tapiz/utils/array.js';

const ignoreNodes = ['settings', 'user'];

export function applyAction(nodes: TuNode[], action: StateActions) {
  if (action.op === 'add') {
    const nodeAlreadyExists = nodes.some((it) => it.id === action.data.id);

    if (nodeAlreadyExists) {
      return nodes;
    }

    nodes = [...nodes];
    const value = action.data;

    if (
      action.position !== undefined &&
      action.position < nodes.length &&
      action.position >= 0
    ) {
      nodes.splice(action.position, 0, value);
    } else {
      nodes.push(value);
    }
  } else if (action.op === 'remove') {
    nodes = nodes.filter((it) => action.data.id !== it.id);
  } else if (action.op === 'patch') {
    const targetIndex = nodes.findIndex((it) => it.id === action.data.id);

    if (targetIndex === -1) {
      return nodes;
    }

    // Shallow-copy only the changed node, reuse all others
    const target = nodes[targetIndex];
    const patched = {
      ...target,
      content: {
        ...target.content,
        ...action.data.content,
      },
    };

    nodes = nodes.slice();
    nodes[targetIndex] = patched;

    if (ignoreNodes.includes(action.data.type)) {
      return nodes;
    }

    if (
      action.position !== undefined &&
      action.position < nodes.length &&
      action.position >= 0
    ) {
      arrayMove(nodes, targetIndex, action.position);
    }
  }

  return nodes;
}
