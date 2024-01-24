import { TuNode } from './node.model.js';
import { Point } from './point.model.js';

export interface CocomaterialTag {
  name: string;
  slug: string;
  url: string;
}

export interface CocomaterialApiVector {
  coloredSvg: null | string;
  coloredSvgContent: string;
  gif: null | string;
  coloredGif: null | string;
  fillColor: null | string;
  id: number;
  name: string;
  strokeColor: null | string;
  svg: null | string;
  svgContent: string;
  tags: string;
  url: string;
}

export interface CocomaterialApiListVectors {
  count: number;
  next: null | string;
  previous: null | string;
  results: CocomaterialApiVector[];
}

export interface Vector {
  url: string;
  width: number;
  height: number;
  position: Point;
  layer: number;
  rotation: number;
}

export function isVector(node: TuNode): node is TuNode<Vector> {
  return node.type === 'vector';
}
