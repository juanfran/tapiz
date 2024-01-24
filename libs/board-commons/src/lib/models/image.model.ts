import { TuNode } from './node.model.js';
import { Point } from './point.model.js';

export interface Image {
  url: string;
  width: number;
  height: number;
  position: Point;
  layer: number;
  rotation: number;
}

export function isImage(node: TuNode): node is TuNode<Image> {
  return node.type === 'image';
}
