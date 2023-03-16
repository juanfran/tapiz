import { RequireAtLeastOne } from 'type-fest';
import { Vector } from './cocomaterial.model';

import { Group } from './group.model';
import { Image } from './image.model';
import { Note } from './note.model';
import { Panel } from './panel.model';
import { Text } from './text.model';

export type NodeType = 'note' | 'group' | 'panel' | 'text' | 'image' | 'vector';

interface NotePatch {
  node: RequireAtLeastOne<Partial<Note>, 'id'>;
  nodeType: 'note';
}

interface PanelPatch {
  node: RequireAtLeastOne<Partial<Panel>, 'id'>;
  nodeType: 'panel';
}

interface GroupPatch {
  node: RequireAtLeastOne<Partial<Group>, 'id'>;
  nodeType: 'group';
}

interface ImagePatch {
  node: RequireAtLeastOne<Partial<Image>, 'id'>;
  nodeType: 'image';
}

interface TextPatch {
  node: RequireAtLeastOne<Partial<Text>, 'id'>;
  nodeType: 'text';
}

interface VectorPatch {
  node: RequireAtLeastOne<Partial<Vector>, 'id'>;
  nodeType: 'vector';
}

interface NoteAdd {
  node: Note;
  nodeType: 'note';
  history?: boolean;
}

interface GroupAdd {
  node: Group;
  nodeType: 'group';
  history?: boolean;
}

interface PanelAdd {
  node: Panel;
  nodeType: 'panel';
  history?: boolean;
}

interface TextAdd {
  node: Text;
  nodeType: 'text';
  history?: boolean;
}

interface ImageAdd {
  node: Image;
  nodeType: 'image';
  history?: boolean;
}

interface VectorAdd {
  node: Vector;
  nodeType: 'vector';
  history?: boolean;
}

export type PatchNode =
  | NotePatch
  | PanelPatch
  | GroupPatch
  | ImagePatch
  | TextPatch
  | VectorPatch;

export type AddNode =
  | NoteAdd
  | GroupAdd
  | PanelAdd
  | TextAdd
  | ImageAdd
  | VectorAdd;

interface NoteRemove {
  node: Note;
  nodeType: 'note';
  history?: boolean;
}

interface GroupRemove {
  node: Group;
  nodeType: 'group';
  history?: boolean;
}

interface PanelRemove {
  node: Panel;
  nodeType: 'panel';
  history?: boolean;
}

interface TextRemove {
  node: Text;
  nodeType: 'text';
  history?: boolean;
}

interface ImageRemove {
  node: Image;
  nodeType: 'image';
  history?: boolean;
}

interface VectorRemove {
  node: Vector;
  nodeType: 'vector';
  history?: boolean;
}

export type RemoveNode =
  | NoteRemove
  | GroupRemove
  | PanelRemove
  | TextRemove
  | ImageRemove
  | VectorRemove;

export interface NodeAction {
  type: string;
  nodeType: NodeType;
  node: unknown;
}
