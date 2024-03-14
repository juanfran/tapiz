import { Drawing } from './drawing.model.js';
import { TuNode } from './node.model.js';
import { Point } from './point.model.js';

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
  drawing: Drawing[];
}

export function isPanel(node: TuNode): node is TuNode<Panel> {
  return node.type === 'panel';
}

export type PanelNode = TuNode<Panel, 'panel'>;
