import { Point, TuNode } from '@team-up/board-commons';

export interface DynamicComponent {
  preventDelete?: () => boolean;
  position?: Point;
  node: TuNode;
  focus: boolean;
}
