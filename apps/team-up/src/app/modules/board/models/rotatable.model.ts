import { NodeType, Point } from '@team-up/board-commons';

export interface Rotatable {
  nodeType: NodeType;
  rotation: number;
  nativeElement: HTMLElement;
  position: Point;
  width: number;
  height: number;
  id: string;
}
