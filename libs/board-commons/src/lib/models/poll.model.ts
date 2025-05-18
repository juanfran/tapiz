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

export type PollAnswerNode = BaseNode<'poll.answer', PollAnswer, []>;
export type PollNode = BaseNode<'poll', PollBoard, PollAnswerNode[]>;
