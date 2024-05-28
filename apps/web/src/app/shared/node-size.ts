import { TuNode } from '@tapiz/board-commons';

export function getNodeSize(
  node: TuNode<{ width?: number; height?: number }, string>,
) {
  let width = node.content.width;
  let height = node.content.height;

  const nodeWidths = {
    poll: 650,
    estimation: 650,
  } as Record<string, number>;

  width ??= nodeWidths[node.type] || 0;
  height ??= width;

  return { width, height };
}
