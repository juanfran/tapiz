import { Point } from './point.model';

export interface Note {
  id: string;
  text: string;
  position: Point;
  ownerId: string;
  votes: number;
}
