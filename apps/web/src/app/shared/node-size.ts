import { TuNode } from '@tapiz/board-commons';

export function getNodeSize(
  node: TuNode<{ width?: number; height?: number }, string>,
) {
  let width = node.content.width;
  let height = node.content.height;

  const nodeWidths = {
    poll: 650,
    estimation: 650,
    token: 100,
  } as Record<string, number>;

  width = width || nodeWidths[node.type];
  height = height || width;

  return { width, height };
}
