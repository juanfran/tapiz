import { TuNode } from './node.model.js';
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
}

export function isGroup(node: TuNode): node is TuNode<Group> {
  return node.type === 'group';
}
