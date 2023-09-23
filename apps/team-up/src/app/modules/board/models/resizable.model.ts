import { Point } from '@team-up/board-commons';

export interface Resizable {
  nodeType: string;
  width: number;
  height: number;
  rotation?: number;
  position: Point;
  id: string;
}

export type ResizePosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';
