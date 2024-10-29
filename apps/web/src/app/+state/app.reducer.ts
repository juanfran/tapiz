import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { AppActions } from './app.actions';
import { AuthUserModel } from '@tapiz/board-commons';
import { NotificationUser } from '@tapiz/board-commons/models/notification.model';

export interface AppState {
  user: AuthUserModel | null;
  notifications: {
    items: NotificationUser[];
    size: number;
  };
}

const initialAppState: AppState = {
  user: null,
  notifications: {
    items: [],
    size: 0,
  },
};

const reducer = createReducer(
  initialAppState,
  on(AppActions.setUser, (state, { user }): AppState => {
    return {
      ...state,
      user,
    };
  }),
  on(AppActions.fetchNotificationsSuccess, (state, { items, size, offset }) => {
    return {
      ...state,
      notifications: {
        items: offset === 0 ? items : [...state.notifications.items, ...items],
        size,
      },
    };
  }),
);

export const appFeature = createFeature({
  name: 'app',
  reducer,
  extraSelectors: ({ selectUser }) => ({
    selectUserId: createSelector(selectUser, (user) => user?.id ?? ''),
  }),
});
