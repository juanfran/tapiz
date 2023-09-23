import { type Type } from '@angular/core';
import { CommonState } from './common-state.model';

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

interface NodeValidatorError {
  success: false;
}

export interface NodeConfig {
  loadComponent: () => Promise<Type<unknown>>;
  config?: unknown;
}

export interface NodeValidator {
  add: (
    data: TuNode,
    userId: string,
    state: CommonState
  ) =>
    | {
        success: true;
        data: TuNode;
      }
    | NodeValidatorError;
  patch: (
    data: TuNode,
    userId: string,
    state: CommonState
  ) =>
    | {
        success: true;
        data: TuNode;
      }
    | NodeValidatorError;
  remove: (
    data: NodeRemove['data'],
    userId: string,
    state: CommonState
  ) =>
    | {
        success: true;
        data: NodeRemove['data'];
      }
    | NodeValidatorError;
}
