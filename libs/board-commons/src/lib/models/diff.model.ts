import { Note } from './note.model';
import { User } from './user.model';
import { Group } from './group.model';
import { RequireAtLeastOne } from 'type-fest';
import { Panel } from './panel.model';
import { Image } from './image.model';
import { Text } from './text.model';

export interface DiffAdd {
  note?: Note[];
  user?: User[];
  group?: Group[];
  panel?: Panel[];
  image?: Image[];
  text?: Text[];
}

export interface DiffRemove {
  note?: Note['id'][];
  user?: User['id'][];
  group?: Group['id'][];
  panel?: Panel['id'][];
  image?: Image['id'][];
  text?: Text['id'][];
}

export interface DiffEdit {
  note?: RequireAtLeastOne<Partial<Note>, 'id'>[];
  group?: RequireAtLeastOne<Partial<Group>, 'id'>[];
  panel?: RequireAtLeastOne<Partial<Panel>, 'id'>[];
  image?: RequireAtLeastOne<Partial<Image>, 'id'>[];
  text?: RequireAtLeastOne<Partial<Text>, 'id'>[];
  user?: RequireAtLeastOne<Partial<User>, 'id'>[];
}

export interface Diff {
  add?: DiffAdd;
  set?: DiffAdd;
  edit?: DiffEdit;
  remove?: DiffRemove;
}
