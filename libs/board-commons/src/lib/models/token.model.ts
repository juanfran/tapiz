import { BaseNode } from './node.model.js';
import { Point } from './point.model.js';

export interface Token {
  color: string;
  backgroundColor: string;
  text: string;
  position: Point;
  width: number;
  height: number;
  layer: number;
}

export type TokenNode = BaseNode<'token', Token, []>;
