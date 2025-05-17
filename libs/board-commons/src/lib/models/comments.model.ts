import { BaseNode } from './node.model.js';
import { User } from './user.model.js';

export interface Comment {
  text: string;
  date: number;
  userId: User['id'];
}

export interface CommentNode extends BaseNode<'comment', Comment> {}
