import { TuNode } from './node.model';
import { Point } from './point.model';

export interface Panel {
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

export function isPanel(node: TuNode): node is TuNode<Panel> {
  return node.type === 'panel';
}
