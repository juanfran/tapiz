import {
  BoardTuNodeFull,
  isBoardTuNodeFull,
  TuNode,
} from '@tapiz/board-commons';
import {
  applyToPoint,
  compose,
  inverse,
  rotateDEG,
  translate,
} from 'transformation-matrix';

export function nodesInsideNode(
  containerNode: BoardTuNodeFull,
  nodes: TuNode[],
): BoardTuNodeFull[] {
  const containerTransform = compose(
    translate(
      containerNode.content.position.x,
      containerNode.content.position.y,
    ),
    rotateDEG(containerNode.content?.rotation ?? 0),
  );

  const containerInverseTransform = inverse(containerTransform);

  return nodes.filter((node): node is BoardTuNodeFull => {
    if (!isBoardTuNodeFull(node)) {
      return false;
    }

    const corners = [
      { x: node.content.position.x, y: node.content.position.y },
      {
        x: node.content.position.x + node.content.width,
        y: node.content.position.y,
      },
      {
        x: node.content.position.x,
        y: node.content.position.y + node.content.height,
      },
      {
        x: node.content.position.x + node.content.width,
        y: node.content.position.y + node.content.height,
      },
    ];

    return corners.every((corner) => {
      const transformedCorner = applyToPoint(containerInverseTransform, corner);
      return (
        transformedCorner.x >= 0 &&
        transformedCorner.x <= containerNode.content.width &&
        transformedCorner.y >= 0 &&
        transformedCorner.y <= containerNode.content.height
      );
    });
  });
}
