import { BaseNode } from './node.model.js';
import { Point } from './point.model.js';

export interface PollOption {
  id: string;
  text: string;
}

export interface PollAnswer {
  optionId: string;
  userId: string;
}

export interface PollBoard {
  position: Point;
  layer: number;
  mode?: 'anonymous' | 'public';
  finished: boolean;
  title: string;
  options: PollOption[];
}

export interface PollAnswerNode
  extends BaseNode<'poll.answer', PollAnswer, []> {}
export interface PollNode
  extends BaseNode<'poll', PollBoard, PollAnswerNode[]> {}
