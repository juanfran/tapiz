import {
  TuNode,
  isBoardTuNodeFull,
  Point,
  BoardTuNodeFull,
} from '@tapiz/board-commons';
import {
  compose,
  translate,
  rotateDEG,
  inverse,
  applyToPoint,
} from 'transformation-matrix';

export function overlappingNodes(
  searchOptions: {
    position: Point;
    width: number;
    height: number;
  },
  nodes: TuNode[],
): BoardTuNodeFull[] {
  return nodes
    .filter((it) => {
      return isBoardTuNodeFull(it);
    })
    .filter((it) => {
      const transform = compose(
        translate(it.content.position.x, it.content.position.y),
        rotateDEG(it.content?.rotation ?? 0),
      );

      const inverseTransform = inverse(transform);

      const searchCorners = [
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

      const transformedSearchCorners = searchCorners.map((corner) =>
        applyToPoint(inverseTransform, corner),
      );

      const searchMinX = Math.min(...transformedSearchCorners.map((c) => c.x));
      const searchMaxX = Math.max(...transformedSearchCorners.map((c) => c.x));
      const searchMinY = Math.min(...transformedSearchCorners.map((c) => c.y));
      const searchMaxY = Math.max(...transformedSearchCorners.map((c) => c.y));

      const nodeMinX = 0;
      const nodeMaxX = it.content.width;
      const nodeMinY = 0;
      const nodeMaxY = it.content.height;

      const xOverlap = searchMaxX > nodeMinX && searchMinX < nodeMaxX;
      const yOverlap = searchMaxY > nodeMinY && searchMinY < nodeMaxY;

      return xOverlap && yOverlap;
    });
}
