import { RequireAtLeastOne } from 'type-fest';

import { Group } from './group.model';
import { Note } from './note.model';
import { Panel } from './panel.model';
import { Image } from './image.model';
import { Text } from './text.model';
import { Vector } from './cocomaterial.model';

export type NodeType = 'note' | 'group' | 'panel' | 'text' | 'image' | 'vector';

interface NoteAdd {
  node: Note;
  type: 'note';
}

interface GroupAdd {
  node: Group;
  type: 'group';
}

interface PanelAdd {
  node: Panel;
  type: 'panel';
}

interface ImageAdd {
  node: Image;
  type: 'image';
}

interface TextAdd {
  node: Text;
  type: 'text';
}

interface VectorAdd {
  node: Vector;
  type: 'vector';
}

interface NotePatch {
  node: RequireAtLeastOne<Partial<Note>, 'id'>;
  type: 'note';
}

interface PanelPatch {
  node: RequireAtLeastOne<Partial<Panel>, 'id'>;
  type: 'panel';
}

interface GroupPatch {
  node: RequireAtLeastOne<Partial<Group>, 'id'>;
  type: 'group';
}

interface ImagePatch {
  node: RequireAtLeastOne<Partial<Image>, 'id'>;
  type: 'image';
}

interface TextPatch {
  node: RequireAtLeastOne<Partial<Text>, 'id'>;
  type: 'text';
}

interface VectorPatch {
  node: RequireAtLeastOne<Partial<Vector>, 'id'>;
  type: 'vector';
}

export interface NodeAdd {
  op: 'add';
  data: NoteAdd | GroupAdd | PanelAdd | ImageAdd | TextAdd | VectorAdd;
}

export interface NodePatch {
  op: 'patch';
  data:
    | NotePatch
    | GroupPatch
    | PanelPatch
    | ImagePatch
    | TextPatch
    | VectorPatch;
}

export interface NodeRemove {
  op: 'remove';
  data: {
    node: {
      id: string;
    };
    type: NodeType;
  };
}

export type StateActions = NodeAdd | NodePatch | NodeRemove;

export interface BachStateActions {
  actions: StateActions[];
  history?: boolean;
}
