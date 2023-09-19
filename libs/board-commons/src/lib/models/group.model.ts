import { Point } from './point.model';

export interface Group {
  id: string;
  title: string;
  position: Point;
  width: number;
  height: number;
  votes: {
    userId: string;
    vote: number;
  }[];
}
