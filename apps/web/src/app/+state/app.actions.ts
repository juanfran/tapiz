import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const AppActions = createActionGroup({
  source: 'App',
  events: {
    'Set user id': props<{ userId: string }>(),
    logout: emptyProps(),
    unauthorized: emptyProps(),
  },
});
