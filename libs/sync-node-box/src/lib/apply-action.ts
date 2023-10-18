import type { TuNode, StateActions } from '@team-up/board-commons';

export function applyAction(nodes: TuNode[], action: StateActions) {
  if (action.op === 'add') {
    const value = action.data;

    if (value) {
      nodes = [...nodes, value];
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
  }

  // move to the top
  const index = nodes.findIndex((it) => action.data.id === it.id);

  if (index !== -1) {
    nodes.push(nodes.splice(index, 1)[0]);
  }

  return nodes;
}
