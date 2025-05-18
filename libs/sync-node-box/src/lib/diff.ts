import { TNode } from '@tapiz/board-commons';

export function diff(node1: TNode, node2: TNode) {
  const diffResult: Record<string, unknown> = {};

  Object.entries(node1.content).forEach(([key, value]) => {
    const content = node2.content as Record<string, unknown>;

    if (content[key] !== value) {
      diffResult[key] = content[key];
    }
  });

  return diffResult;
}
