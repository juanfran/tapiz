import { createActionGroup, emptyProps, props } from '@ngrx/store';
import {
  Point,
  Zone,
  ZoneConfig,
  User,
  Board,
  PatchNode,
  NodeType,
} from '@team-up/board-commons';
import { NativeEmoji } from 'emoji-picker-element/shared';

export const PageActions = createActionGroup({
  source: 'Page',
  events: {
    'Init board': emptyProps(),
    'Close board': emptyProps(),
    'Fetch board success': props<{ owners: string[]; name: string }>(),
    'Join board': props<{ boardId: string }>(),
    'Set user view': props<{ zoom: number; position: Point }>(),
    'Set move enabled': props<{ enabled: boolean }>(),
    'Set user id': props<{ userId: string }>(),
    'Set init zone': props<{ initZone: ZoneConfig | null }>(),
    'Set focus id': props<{ focusId: string }>(),
    'Change canvas mode': props<{ canvasMode: string }>(),
    'Set zone': props<{ zone: Zone | null }>(),
    'Zone to group': emptyProps(),
    'Zone to panel': emptyProps(),
    'Init drag zone': props<PatchNode>(),
    'End drag node': props<{
      id: string;
      nodeType: NodeType;
      initialPosition: Point;
      finalPosition: Point;
    }>(),
    Undo: emptyProps(),
    Redo: emptyProps(),
    'Toggle user highlight': props<{ id: User['id'] }>(),
    'Set popup open': props<{ popup: string }>(),
    'Create board': props<{ name: string }>(),
    'Fetch boards': emptyProps(),
    'Fetch boards success': props<{ boards: Board[] }>(),
    'Text toolbar click': emptyProps(),
    'Ready to vote': emptyProps(),
    'Remove board': props<{ id: Board['id'] }>(),
    'Board not found': props<{ id: Board['id'] }>(),
    'Select emoji': props<{ emoji: NativeEmoji }>(),
  },
});
