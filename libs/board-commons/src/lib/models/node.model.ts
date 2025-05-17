import { NoteNode, Note } from './note.model.js';
import { Panel, PanelNode } from './panel.model.js';
import {
  PollAnswer,
  PollBoard,
  PollAnswerNode,
  PollNode,
} from './poll.model.js';
import { Image, ImageNode } from './image.model.js';
import { Group, GroupNode } from './group.model.js';
import { Prettify } from '@ngrx/store/src/models.js';
// import { Point } from './point.model.js';
import type { Simplify, Get } from 'type-fest';

export interface BaseNode<
  T extends string, // discrimination type
  C, // content type
  Ch extends BaseNode<string, unknown, []>[] = BaseNode<string, unknown, []>[],
> {
  id: string;
  type: T;
  content: C;
  children?: Ch;
}

export type ContentOfNode<T extends TNode['type']> = Extract<
  TNode,
  { type: T }
>['content'];

export type TNode =
  | PanelNode
  | NoteNode
  | ImageNode
  | PollNode
  | PollAnswerNode
  | GroupNode;

export interface NodeAdd {
  op: 'add';
  data: Simplify<
    Pick<TNode, 'id' | 'type'> & {
      content: ContentOfNode<TNode['type']>;
    }
  >;
  parent?: string;
  position?: number;
}

export type NodePatch = {
  [T in TNode['type']]: {
    op: 'patch';
    data: {
      id: string;
      type: T;
      content: Partial<ContentOfNode<T>>;
    };
    parent?: string;
    position?: number;
  };
}[TNode['type']];

export interface NodeRemove {
  op: 'remove';
  data: Pick<TNode, 'id' | 'type'>;
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
      data: TNode;
    }
  | NodeValidatorError;

type RemoveResponse =
  | {
      success: true;
      data: NodeRemove['data'];
    }
  | NodeValidatorError;

// export type BoardTuNode = TuNode<{
//   position: Point;
//   layer: number;
//   rotation?: number;
//   width?: number;
//   height?: number;
// }>;

// export type BoardTuNodeFull = TuNode<{
//   position: Point;
//   layer: number;
//   rotation?: number;
//   width: number;
//   height: number;
// }>;
export interface NodeValidator {
  add: (
    data: TNode,
    state: {
      userId: string;
      nodes: TNode[];
      isAdmin: boolean;
      boardId: string;
      userPrivateId: string;
      parentNode?: TNode;
    },
  ) => Promise<AddPatchResponse>;
  patch: (
    data: TNode,
    state: {
      userId: string;
      nodes: TNode[];
      isAdmin: boolean;
      boardId: string;
      userPrivateId: string;
      node: TNode;
      parentNode?: TNode;
    },
  ) => Promise<AddPatchResponse>;
  remove: (
    data: NodeRemove['data'],
    state: {
      userId: string;
      nodes: TNode[];
      isAdmin: boolean;
      boardId: string;
      userPrivateId: string;
      node: TNode;
      parentNode?: TNode;
    },
  ) => Promise<RemoveResponse>;
}

// export const isBoardTuNode = (node: TuNode): node is BoardTuNode => {
//   return 'position' in node.content;
// };

// export const isBoardTuNodeFull = (node: TuNode): node is BoardTuNodeFull => {
//   return 'position' in node.content && 'width' in node.content;
// };
