import { TuNode } from './node.model.js';

export interface Board {
  id: string;
  name: string;
  board: TuNode<object, string>[];
  createdAt: string;
  teamId: string | null;
  public: boolean;
}

export interface BoardUser extends Omit<Board, 'board'> {
  role: 'admin' | 'member' | 'guest';
  starred: boolean;
  lastAccessedAt: string;
  isAdmin: boolean;
}

export interface PrivateBoardUser extends BoardUser {
  privateId: string;
  teamName: string | null;
}
