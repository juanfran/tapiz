import { createActionGroup, props } from '@ngrx/store';

export const AppActions = createActionGroup({
  source: 'App',
  events: {
    'Set user id': props<{ userId: string }>(),
  },
});
