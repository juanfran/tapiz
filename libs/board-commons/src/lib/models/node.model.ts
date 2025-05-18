import { NoteNode } from './note.model.js';
import { PanelNode } from './panel.model.js';
import { PollAnswerNode, PollNode } from './poll.model.js';
import { ImageNode } from './image.model.js';
import { GroupNode } from './group.model.js';
// import { Point } from './point.model.js';
import type { Simplify } from 'type-fest';
import { TextNode } from './text.model.js';
import { UserNode } from './user.model.js';
import { CommentNode } from './comments.model.js';
import { EstimationBoardNode } from './estimation.model.js';
import { VectorNode } from './cocomaterial.model.js';
import { TimerNode } from './timer.model.js';
import { TokenNode } from './token.model.js';

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
  | VectorNode
  | PollNode
  | PollAnswerNode
  | GroupNode
  | TextNode
  | UserNode
  | CommentNode
  | EstimationBoardNode
  | TimerNode
  | TokenNode;

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

export type BoardTNodeFull = PanelNode | ImageNode | VectorNode;

// export type BoardTNode = TNode<{
//   position: Point;
//   layer: number;
//   rotation?: number;
//   width?: number;
//   height?: number;
// }>;

// export type BoardTNodeFull = TNode<{
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

// export const isBoardTNode = (node: TNode): node is BoardTNode => {
//   return 'position' in node.content;
// };

export const isBoardTNodeFull = (node: TNode): node is BoardTNodeFull => {
  return (
    node.type === 'panel' || node.type === 'image' || node.type === 'vector'
  );
};
