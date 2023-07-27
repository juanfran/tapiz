import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Board } from '@team-up/board-commons';

export const HomeActions = createActionGroup({
  source: 'Home',
  events: {
    'Fetch boards': emptyProps(),
    'Fetch boards success': props<{ boards: Board[] }>(),
    'Remove board': props<{ id: Board['id'] }>(),
    'Leave board': props<{ id: Board['id'] }>(),
    'Create board': props<{ name: string }>(),
    'Duplicate board': props<{ id: Board['id'] }>(),
    'Remove account': emptyProps(),
  },
});
