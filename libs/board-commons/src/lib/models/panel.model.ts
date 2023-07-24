import { Point } from './point.model';

export interface Panel {
  id: string;
  title: string;
  position: Point;
  width: number;
  height: number;
  color?: string;
  backgroundColor?: string;
  fontColor?: string;
  fontSize?: number;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
}
