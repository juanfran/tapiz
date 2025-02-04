import { TuNode } from './node.model.js';

export interface Timer {
  startTime?: string;
  active?: boolean;
  remainingTime?: number;
}

export function isTimer(node: TuNode): node is TuNode<Timer> {
  return node.type === 'timer';
}
