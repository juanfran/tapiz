import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { AuthUserModel } from '@tapiz/board-commons';

export const AppActions = createActionGroup({
  source: 'App',
  events: {
    'Set user': props<{ user: AuthUserModel | null }>(),
    logout: emptyProps(),
    unauthorized: emptyProps(),
  },
});
