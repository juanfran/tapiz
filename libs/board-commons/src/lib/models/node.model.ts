export type NodeType = 'note' | 'group' | 'panel' | 'text' | 'image' | 'vector';

export interface TuNode<T = object> {
  id: string;
  type: string;
  content: T;
}

export interface NodeAdd {
  op: 'add';
  data: TuNode;
}

export interface NodePatch {
  op: 'patch';
  data: TuNode;
}

export interface NodeRemove {
  op: 'remove';
  data: Pick<TuNode, 'id' | 'type'>;
}

export type StateActions = NodeAdd | NodePatch | NodeRemove;

export interface BachStateActions {
  actions: StateActions[];
  history?: boolean;
}
