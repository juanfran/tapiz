import { RequireAtLeastOne } from 'type-fest';
import { Group } from './group.model';
import { Image } from './image.model';
import { Note } from './note.model';
import { Panel } from './panel.model';
import { Text } from './text.model';

interface NotePatch {
  node: RequireAtLeastOne<Partial<Note>, 'id'>;
  nodeType: 'notes';
}

interface PanelPatch {
  node: RequireAtLeastOne<Partial<Panel>, 'id'>;
  nodeType: 'panels';
}

interface GroupPatch {
  node: RequireAtLeastOne<Partial<Group>, 'id'>;
  nodeType: 'groups';
}

interface ImagePatch {
  node: RequireAtLeastOne<Partial<Image>, 'id'>;
  nodeType: 'images';
}

interface TextPatch {
  node: RequireAtLeastOne<Partial<Text>, 'id'>;
  nodeType: 'texts';
}

export type PatchNode =
  | NotePatch
  | PanelPatch
  | GroupPatch
  | ImagePatch
  | TextPatch;

export type AddNode =
  | {
      node: Note;
      nodeType: 'note';
      history? : boolean;
    }
  | {
      node: Group;
      nodeType: 'group';
      history? : boolean;
    }
  | {
      node: Panel;
      nodeType: 'panel';
      history? : boolean;
    }
  | {
      node: Text;
      nodeType: 'text';
      history? : boolean;
    }
  | {
      node: Image;
      nodeType: 'image';
      history? : boolean;
    };

export type RemoveNode =
  | {
    node: Note;
    nodeType: 'note';
    history? : boolean;
  }
  | {
    node: Group;
    nodeType: 'group';
    history? : boolean;
  }
  | {
    node: Panel;
    nodeType: 'panel';
    history? : boolean;
  }
  | {
    node: Text;
    nodeType: 'text';
    history? : boolean;
  }
  | {
    node: Image;
    nodeType: 'image';
    history? : boolean;
  };
