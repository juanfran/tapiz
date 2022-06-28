import { Point } from './point.model';

export interface Text {
  id: string;
  text: string;
  color: string;
  size: number;
  position: Point;
  width: number;
  height: number;
}
