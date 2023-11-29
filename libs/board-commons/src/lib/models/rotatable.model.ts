import { Point } from '@team-up/board-commons';

export interface Rotatable {
  rotation: number;
  position: Point;
  width: number;
  height: number;
}

export interface RotatableHost extends Rotatable {
  nativeElement: HTMLElement;
}
