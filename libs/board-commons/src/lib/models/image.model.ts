import { Point } from './point.model';

export interface Image {
  id: string;
  url: string;
  width: number;
  height: number;
  position: Point;
  rotation: number;
}
