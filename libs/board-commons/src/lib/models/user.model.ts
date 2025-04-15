import { TuNode } from './node.model.js';
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

export type UserNode = TuNode<User>;

export function isUserNode(node: TuNode): node is UserNode {
  return node.type === 'user';
}
