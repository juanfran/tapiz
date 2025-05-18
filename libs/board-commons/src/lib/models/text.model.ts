import { BaseNode } from './node.model.js';
import { Point } from './point.model.js';

export interface Text {
  text: string;
  position: Point;
  layer: number;
  width: number;
  height: number;
  rotation: number;
}

export type TextNode = BaseNode<'text', Text>;
