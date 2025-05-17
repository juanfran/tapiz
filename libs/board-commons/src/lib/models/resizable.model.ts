import { Point } from '../models/point.model.js';
import { TNode } from './node.model.js';

export interface Resizable {
  width: number;
  height: number;
  rotation?: number;
  position: Point;
}

export type ResizePosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export const isResizable = (node: TNode) => {
  return (
    'width' in node.content &&
    'height' in node.content &&
    'position' in node.content
  );
};
