import { createActionGroup, emptyProps, props } from '@ngrx/store';
import {
  Point,
  Zone,
  ZoneConfig,
  User,
  BoardUser,
  CocomaterialTag,
  CocomaterialApiListVectors,
  Note,
  NodeAdd,
  TuNode,
} from '@team-up/board-commons';
import { NativeEmoji } from 'emoji-picker-element/shared';

export const PageActions = createActionGroup({
  source: 'Page',
  events: {
    'Init board': props<{ userId: User['id'] }>(),
    'Close board': emptyProps(),
    'Fetch board success': props<{
      isAdmin: boolean;
      name: string;
      isPublic: boolean;
      privateId: string;
    }>(),
    'Join board': props<{ boardId: string }>(),
    'Set user view': props<{ zoom: number; position: Point }>(),
    'Set move enabled': props<{ enabled: boolean }>(),
    'Set init zone': props<{ initZone: ZoneConfig | null }>(),
    'Set focus id': props<{ focusId: string; ctrlKey?: boolean }>(),
    'Change canvas mode': props<{ canvasMode: string }>(),
    'Set zone': props<{ zone: Zone | null }>(),
    'Zone to group': emptyProps(),
    'Zone to panel': emptyProps(),
    'End drag node': props<{
      nodes: {
        id: string;
        nodeType: string;
        initialPosition: Point;
        finalPosition: Point;
      }[];
    }>(),
    Undo: emptyProps(),
    Redo: emptyProps(),
    'Toggle user highlight': props<{ id: User['id'] }>(),
    'Set popup open': props<{ popup: string }>(),
    'Text toolbar click': emptyProps(),
    'Ready to vote': emptyProps(),
    'Board not found': props<{ id: BoardUser['id'] }>(),
    'Select emoji': props<{ emoji: NativeEmoji }>(),
    'Fetch cocomaterial tags success': props<{ tags: CocomaterialTag[] }>(),
    'Fetch vectors': props<{ tags: string[] }>(),
    'Fetch vectors success': props<{
      vectors: CocomaterialApiListVectors;
      page: number;
    }>(),
    'Next vectors page': props<{ tags: string[] }>(),
    'Ready to search': emptyProps(),
    'Go to node': props<{ nodeId: string }>(),
    'Paste nodes': props<{ nodes: NodeAdd['data'][]; history: boolean }>(),
    'Follow user': props<{ id: User['id'] }>(),
    'Go to user': props<{ id: User['id'] }>(),
    'Set board privacy': props<{ isPublic: boolean }>(),
    'Toggle show votes': props<{ userId: string }>(),
    'Stop highlight': emptyProps(),
    'Node snapshot': props<{ prev: TuNode; curr: TuNode }>(),
    'Lock board': props<{ lock: boolean }>(),
    'Refetch board': emptyProps(),
    Drawing: props<{ drawing: boolean }>(),
  },
});
