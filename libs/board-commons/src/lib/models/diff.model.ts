import { Note } from './note.model';
import { fabric } from 'fabric';
import { User } from './user.model';
import { Group } from './group.model';
import { RequireAtLeastOne } from 'type-fest';
import { Panel } from './panel.model';
import { Image } from './image.model';
import { Text } from './text.model';

export interface DiffAdd {
  notes?: Note[];
  paths?: fabric.Point[][];
  users?: User[];
  groups?: Group[];
  panels?: Panel[];
  images?: Image[];
  texts?: Text[];
}

export interface DiffRemove {
  notes?: Note['id'][];
  users?: User['id'][];
  groups?: Group['id'][];
  panels?: Panel['id'][];
  images?: Image['id'][];
  texts?: Text['id'][];
}

export interface DiffEdit {
  notes?: RequireAtLeastOne<Partial<Note>, 'id'>[];
  groups?: RequireAtLeastOne<Partial<Group>, 'id'>[];
  panels?: RequireAtLeastOne<Partial<Panel>, 'id'>[];
  images?: RequireAtLeastOne<Partial<Image>, 'id'>[];
  texts?: RequireAtLeastOne<Partial<Text>, 'id'>[];
  users?: RequireAtLeastOne<Partial<User>, 'id'>[];
}

export interface Diff {
  add?: DiffAdd;
  set?: DiffAdd;
  edit?: DiffEdit;
  remove?: DiffRemove;
}
