import { TuNode } from './node.model';
import { Point } from './point.model';

export interface Text {
  text: string;
  color: string;
  size: number;
  position: Point;
  width: number;
  height: number;
}

export function isText(node: TuNode): node is TuNode<Text> {
  return node.type === 'text';
}
