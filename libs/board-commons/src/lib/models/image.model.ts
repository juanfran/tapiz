import { BaseNode } from './node.model.js';
import { Point } from './point.model.js';

export interface Image {
  url: string;
  width: number;
  height: number;
  position: Point;
  layer: number;
  rotation: number;
}

export interface ImageNode extends BaseNode<'image', Image> {}
