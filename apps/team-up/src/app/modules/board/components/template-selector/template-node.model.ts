import { Point } from '@team-up/board-commons';

export interface TemplaNode {
  [key: string]: unknown;
  position: Point;
  layer: number;
  width?: number;
  height?: number;
}
