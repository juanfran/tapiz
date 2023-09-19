import { User } from './user.model';
import { TuNode } from './node.model';

export interface CommonState {
  users: User[];
  nodes: TuNode[];
}

export type DBState = Pick<CommonState, 'nodes'>;
