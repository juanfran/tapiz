import { BaseNode } from './node.model.js';

export interface Timer {
  startTime?: string;
  active?: boolean;
  remainingTime?: number;
}

export type TimerNode = BaseNode<'timer', Timer, []>;
