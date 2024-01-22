import { TuNode } from './node.model';
import { Point } from './point.model';

export interface Panel {
  text: string;
  position: Point;
  layer: number;
  width: number;
  height: number;
  rotation: number;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  textAlign?: 'start' | 'center' | 'end';
}

export function isPanel(node: TuNode): node is TuNode<Panel> {
  return node.type === 'panel';
}
