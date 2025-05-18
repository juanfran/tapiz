import { BaseNode } from './node.model.js';
import { Point } from './point.model.js';

export interface User {
  id: string;
  name: string;
  visible: boolean;
  connected: boolean;
  cursor: Point | null;
  position?: Point;
  zoom?: number;
}

export interface BoardUserInfo {
  name: string;
  picture: string | null;
  role: 'admin' | 'member' | 'guest';
  id: string;
}

export type UserNode = BaseNode<'user', User>;
