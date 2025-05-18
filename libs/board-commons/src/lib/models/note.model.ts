import { Drawing } from './drawing.model.js';
import { BaseNode } from './node.model.js';
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
  width: number;
  height: number;
  color?: string | null;
  textHidden?: boolean;
}

export type NoteNode = BaseNode<'note', Note, []>;
