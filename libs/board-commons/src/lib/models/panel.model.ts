import { Point } from './point.model';

export interface Panel {
  id: string;
  title: string;
  position: Point;
  width: number;
  height: number;
  color?: string;
}
