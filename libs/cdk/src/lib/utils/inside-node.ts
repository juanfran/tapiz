import { isBoardTuNodeFull, Point, TuNode } from '@tapiz/board-commons';
import {
  applyToPoint,
  compose,
  inverse,
  rotateDEG,
  translate,
} from 'transformation-matrix';

export function insideNode<T>(
  searchOptions: {
    position: Point;
    width: number;
    height: number;
  },
  nodes: TuNode[],
): TuNode<T> | undefined {
  const node = nodes
    .filter((it) => {
      return isBoardTuNodeFull(it);
    })
    .find((it) => {
      const transform = compose(
        translate(it.content.position.x, it.content.position.y),
        rotateDEG(it.content?.rotation ?? 0),
      );

      const inverseTransform = inverse(transform);

      const corners = [
        { x: searchOptions.position.x, y: searchOptions.position.y },
        {
          x: searchOptions.position.x + searchOptions.width,
          y: searchOptions.position.y,
        },
        {
          x: searchOptions.position.x,
          y: searchOptions.position.y + searchOptions.height,
        },
        {
          x: searchOptions.position.x + searchOptions.width,
          y: searchOptions.position.y + searchOptions.height,
        },
      ];

      return corners.every((corner) => {
        const transformedCorner = applyToPoint(inverseTransform, corner);
        return (
          transformedCorner.x >= 0 &&
          transformedCorner.x <= it.content.width &&
          transformedCorner.y >= 0 &&
          transformedCorner.y <= it.content.height
        );
      });
    });

  return node as TuNode<T> | undefined;
}
