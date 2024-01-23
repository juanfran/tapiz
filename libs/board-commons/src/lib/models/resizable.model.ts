import { Point } from '../models/point.model';

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
