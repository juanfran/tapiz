import { Drawing } from './drawing.model.js';
import { TuNode } from './node.model.js';
import { Point } from './point.model.js';

export interface Note {
  text: string;
  position: Point;
  layer: number;
  ownerId: string;
  votes: {
    userId: string;
    vote: number;
  }[];
  emojis: {
    unicode: string;
    position: Point;
  }[];
  drawing: Drawing[];
}

export function isNote(node: TuNode): node is TuNode<Note> {
  return node.type === 'note';
}
