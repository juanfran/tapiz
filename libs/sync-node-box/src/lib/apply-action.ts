import type { TNode, StateActions } from '@tapiz/board-commons';
import { arrayMove } from '@tapiz/utils/array.js';

const ignoreNodes = ['settings', 'user'];

export function applyAction(nodes: TNode[], action: StateActions) {
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
    nodes = nodes.map((it) => {
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
    });

    if (ignoreNodes.includes(action.data.type)) {
      return nodes;
    }

    const from = nodes.findIndex((it) => it.id === action.data.id);

    if (from === -1) {
      return nodes;
    }

    if (
      action.position !== undefined &&
      action.position < nodes.length &&
      action.position >= 0
    ) {
      arrayMove(nodes, from, action.position);
    }
  }

  return nodes;
}
