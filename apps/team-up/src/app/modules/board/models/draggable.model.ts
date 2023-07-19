import { NodeType, Point } from '@team-up/board-commons';

export declare interface Draggable {
  preventDrag: boolean;
  position: Point;
  nativeElement: HTMLElement;
  id: string;
  nodeType: NodeType;
}
