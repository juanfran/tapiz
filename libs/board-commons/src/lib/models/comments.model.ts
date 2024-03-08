import { TuNode } from './node.model.js';
import { User } from './user.model.js';

export interface Comment {
  text: string;
  date: number;
  userId: User['id'];
}

export type CommentNode = TuNode<Comment, 'comment'>;
