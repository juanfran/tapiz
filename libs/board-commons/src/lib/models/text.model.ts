import { TuNode } from './node.model.js';
import { Point } from './point.model.js';

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

export type TextNode = TuNode<Text, 'text'>;
