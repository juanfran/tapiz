import { TuNode } from './node.model';
import { Point } from './point.model';

export interface Text {
  text: string;
  position: Point;
  layer: number;
  width: number;
  height: number;
  rotation: number;
}

export function isText(node: TuNode): node is TuNode<Text> {
  return node.type === 'text';
}
