import { TuNode } from '@team-up/board-commons';

export function diff(node1: TuNode, node2: TuNode) {
  const diffResult: Record<string, unknown> = {};

  Object.entries(node1.content).forEach(([key, value]) => {
    const content = node2.content as Record<string, unknown>;

    if (content[key] !== value) {
      diffResult[key] = content[key];
    }
  });

  return diffResult;
}
