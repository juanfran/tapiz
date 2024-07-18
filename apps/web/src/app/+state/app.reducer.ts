import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { AppActions } from './app.actions';
import { AuthUserModel } from '@tapiz/board-commons';

export interface AppState {
  user: AuthUserModel | null;
}

const initialAppState: AppState = {
  user: null,
};

const reducer = createReducer(
  initialAppState,
  on(AppActions.setUser, (state, { user }): AppState => {
    return {
      ...state,
      user,
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
