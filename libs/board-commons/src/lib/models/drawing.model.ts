import { Point } from './point.model.js';

export interface Drawing {
  points: Point[];
  size: number;
  color: string;
}
