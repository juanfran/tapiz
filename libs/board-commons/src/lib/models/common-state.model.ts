import { Note } from './note.model';
import { User } from './user.model';
import { fabric } from 'fabric';
import { Group } from './group.model';
import { Panel } from './panel.model';
import { Image } from './image.model';
import { Text } from './text.model';

export interface CommonState {
  notes: Note[];
  users: User[];
  paths?: fabric.Point[][];
  groups: Group[];
  panels: Panel[];
  images: Image[];
  texts: Text[];
}

export type DBState = Pick<
  CommonState,
  'notes' | 'paths' | 'groups' | 'panels' | 'images' | 'texts'
>;
