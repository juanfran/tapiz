import { Note } from './note.model';
import { User } from './user.model';
import { Group } from './group.model';
import { Panel } from './panel.model';
import { Image } from './image.model';
import { Text } from './text.model';
import { Vector } from './cocomaterial.model';

export interface CommonState {
  notes: Note[];
  users: User[];
  groups: Group[];
  panels: Panel[];
  images: Image[];
  texts: Text[];
  vectors: Vector[];
}

export type DBState = Pick<
  CommonState,
  'notes' | 'groups' | 'panels' | 'images' | 'texts' | 'vectors'
>;
