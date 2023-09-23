import { Point } from '@team-up/board-commons';

export interface Rotatable {
  nodeType: string;
  rotation: number;
  nativeElement: HTMLElement;
  position: Point;
  width: number;
  height: number;
  id: string;
}
