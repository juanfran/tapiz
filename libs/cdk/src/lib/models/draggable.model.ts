import { Point } from '@tapiz/board-commons';

export declare interface Draggable {
  preventDrag?: () => boolean;
  position: Point;
  nativeElement: HTMLElement;
  id: string;
  nodeType: string;
  handler?: HTMLElement;
}
