import { createActionGroup, emptyProps, props } from '@ngrx/store';
import {
  Point,
  User,
  BoardUser,
  NodeAdd,
  TuNode,
  BoardUserInfo,
} from '@tapiz/board-commons';
import { Emoji } from 'emoji-picker-element/shared';

export const BoardPageActions = createActionGroup({
  source: 'Page',
  events: {
    'Init board': props<{ userId: User['id'] }>(),
    'Close board': emptyProps(),
    'Fetch board success': props<{
      isAdmin: boolean;
      name: string;
      isPublic: boolean;
      privateId: string;
      teamName: string | null;
      teamId: string | null;
    }>(),
    'Join board': props<{ boardId: string }>(),
    'Set user view': props<{ zoom: number; position: Point }>(),
    'Set move enabled': props<{ enabled: boolean }>(),
    'Set focus id': props<{ focusId: string; ctrlKey?: boolean }>(),
    'Change board mode': props<{ boardMode: number }>(),
    'End drag node': props<{
      nodes: {
        id: string;
        nodeType: string;
        initialPosition: Point;
        initialIndex: number;
        finalPosition: Point;
      }[];
    }>(),
    Undo: emptyProps(),
    Redo: emptyProps(),
    'Toggle user highlight': props<{ id: User['id'] }>(),
    'Set popup open': props<{ popup: string }>(),
    'Set popup pinned': props<{ pinned: boolean }>(),
    'Ready to vote': emptyProps(),
    'Board not found': props<{ id: BoardUser['id'] }>(),
    'Select emoji': props<{ emoji: Emoji }>(),
    'Ready to search': emptyProps(),
    'Go to node': props<{ nodeId: string }>(),
    'Paste nodes': props<{ nodes: NodeAdd['data'][]; history: boolean }>(),
    'Paste nodes success': props<{ nodes: NodeAdd[] }>(),
    'Follow user': props<{ id: User['id'] }>(),
    'Go to user': props<{ id: User['id'] }>(),
    'Set board privacy': props<{ isPublic: boolean }>(),
    'Toggle show votes': props<{ userId: string }>(),
    'Stop highlight': emptyProps(),
    'Node snapshot': props<{ prev: TuNode; curr: TuNode }>(),
    'Lock board': props<{ lock: boolean }>(),
    'Refetch board': emptyProps(),
    'Select nodes': props<{ ids: string[] }>(),
    'Set board cursor': props<{ cursor: string }>(),
    'Set node selection': props<{ enabled: boolean }>(),
    'Set loading bar': props<{ loadingBar: boolean }>(),
    'Pan in progress': props<{ panInProgress: boolean }>(),
    addToBoardInProcess: props<{ inProcess: boolean }>(),
    dragInProgress: props<{ inProgress: boolean }>(),
    setBoardUsers: props<{ users: BoardUserInfo[] }>(),
    boardLoaded: emptyProps(),
    'Fetch mentions': emptyProps(),
    'Fetch mentions success': props<{
      mentions: { id: string; name: string }[];
    }>(),
    'Mention user': props<{ userId: string; nodeId?: string }>(),
    'New user joined': emptyProps(),
    'Set drag enabled': props<{ dragEnabled: boolean }>(),
    'User role changed': emptyProps(),
    'Delete member': props<{ userId: string }>(),
    'Change role': props<{
      userId: string;
      role: BoardUser['role'];
    }>(),
    'Set show set board center': props<{ show: boolean }>(),
  },
});
