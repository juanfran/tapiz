import { Point } from './point.model.js';

export interface TuNode<C = object, T = string, H = object> {
  id: string;
  type: T;
  content: C;
  children?: TuNode<H>[];
}

export interface NodeAdd<T = object> {
  op: 'add';
  data: TuNode<T>;
  parent?: string;
  position?: number;
}

export interface NodePatch<T = object> {
  op: 'patch';
  data: TuNode<Partial<T>>;
  parent?: string;
  position?: number;
}

export interface NodeRemove {
  op: 'remove';
  data: Pick<TuNode, 'id' | 'type'>;
  parent?: string;
}

export type StateActions = NodeAdd | NodePatch | NodeRemove;

export interface BachStateActions {
  actions: StateActions[];
  history?: boolean;
}

interface NodeValidatorError {
  success: false;
}

export interface NodeConfig {
  loadComponent: () => Promise<unknown>;
  config?: unknown;
}

type AddPatchResponse =
  | {
      success: true;
      data: TuNode;
    }
  | NodeValidatorError;

type RemoveResponse =
  | {
      success: true;
      data: NodeRemove['data'];
    }
  | NodeValidatorError;

export type BoardTuNode = TuNode<{
  position: Point;
  layer: number;
  rotation?: number;
  width?: number;
  height?: number;
}>;

export type BoardTuNodeFull = TuNode<{
  position: Point;
  layer: number;
  rotation?: number;
  width: number;
  height: number;
}>;
export interface NodeValidator {
  add: (
    data: TuNode,
    state: {
      userId: string;
      nodes: TuNode[];
      isAdmin: boolean;
      boardId: string;
      userPrivateId: string;
      parentNode?: TuNode;
    },
  ) => Promise<AddPatchResponse>;
  patch: (
    data: TuNode,
    state: {
      userId: string;
      nodes: TuNode[];
      isAdmin: boolean;
      boardId: string;
      userPrivateId: string;
      node: TuNode;
      parentNode?: TuNode;
    },
  ) => Promise<AddPatchResponse>;
  remove: (
    data: NodeRemove['data'],
    state: {
      userId: string;
      nodes: TuNode[];
      isAdmin: boolean;
      boardId: string;
      userPrivateId: string;
      node: TuNode;
      parentNode?: TuNode;
    },
  ) => Promise<RemoveResponse>;
}

export const isBoardTuNode = (node: TuNode): node is BoardTuNode => {
  return 'position' in node.content;
};

export const isBoardTuNodeFull = (node: TuNode): node is BoardTuNodeFull => {
  return 'position' in node.content && 'width' in node.content;
};
