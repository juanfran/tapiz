import { Drawing } from './drawing.model.js';
import { BaseNode } from './node.model.js';
import { Point } from './point.model.js';

export interface Panel {
  text: string;
  position: Point;
  layer: number;
  width: number;
  height: number;
  rotation: number;
  color?: string | null;
  backgroundColor?: string | null;
  borderColor?: string | null;
  borderWidth?: number | null;
  borderRadius?: number | null;
  textAlign?: 'start' | 'center' | 'end';
  drawing: Drawing[];
  unLocked?: boolean;
}

export interface PanelNode extends BaseNode<'panel', Panel> {}

const panelNodeExampe: PanelNode = {
  id: '1',
  type: 'panel',
  content: {
    text: 'Hello World',
    position: { x: 0, y: 0 },
    layer: 1,
    width: 100,
    height: 100,
    rotation: 0,
    color: '#FFFFFF',
    backgroundColor: '#000000',
    borderColor: '#FF0000',
    borderWidth: 2,
    borderRadius: 5,
    textAlign: 'center',
    drawing: [],
    unLocked: false,
  },
  children: [],
};
