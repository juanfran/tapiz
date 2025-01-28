import { Point, ResizePosition } from '@tapiz/board-commons';

export interface ResizeEvent {
  event: {
    x: number;
    y: number;
    shiftKey: boolean;
  };
  type: 'start' | 'move';
  position: ResizePosition;
  initialPosition: Point;
  nodeRotation: number;
}
