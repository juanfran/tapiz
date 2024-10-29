import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { AuthUserModel } from '@tapiz/board-commons';
import { NotificationUser } from '@tapiz/board-commons/models/notification.model';

export const AppActions = createActionGroup({
  source: 'App',
  events: {
    'Set user': props<{ user: AuthUserModel | null }>(),
    logout: emptyProps(),
    unauthorized: emptyProps(),
    'Fetch notifications success': props<{
      items: NotificationUser[];
      offset: number;
      size: number;
    }>(),
    'Clear notifications': emptyProps(),
    'Fetch notifications': props<{ offset: number }>(),
  },
});
