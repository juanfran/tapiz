import { TNode } from '@tapiz/board-commons';

export function getNodeSize(
  node: TNode<{ width?: number; height?: number }, string>,
) {
  let width = node.content.width;
  let height = node.content.height;

  const nodeWidths: Record<string, number> = {
    poll: 650,
    estimation: 650,
    token: 100,
  };

  width = width || nodeWidths[node.type];
  height = height || width;

  return { width, height };
}
