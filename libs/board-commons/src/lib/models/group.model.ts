import { BaseNode } from './node.model.js';
import { Point } from './point.model.js';

export interface Group {
  title: string;
  position: Point;
  layer: number;
  width: number;
  height: number;
  votes: {
    userId: string;
    vote: number;
  }[];
  unLocked?: boolean;
}
export type GroupNode = BaseNode<'group', Group>;
