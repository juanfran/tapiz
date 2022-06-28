import { Point } from '@team-up/board-commons';

export declare interface Draggable {
  move(position: Point): void;
  startDrag(position: Point): void;
  endDrag(): void;
  preventDrag: boolean;
  position: Point;
}
