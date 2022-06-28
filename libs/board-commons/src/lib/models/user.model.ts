import { Point } from './point.model';

export interface User {
  id: string;
  name: string;
  visible: boolean;
  connected: boolean;
  cursor: Point | null;
}

export interface Auth {
  name: string;
  picture: string;
  sub: string;
}
