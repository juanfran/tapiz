import { createFeature, createReducer, on } from '@ngrx/store';
import { User } from '@team-up/board-commons';
import { AppActions } from './app.actions';

export interface AppState {
  userId: User['id'];
}

const initialAppState: AppState = {
  userId: '',
};

const reducer = createReducer(
  initialAppState,
  on(AppActions.setUserId, (state, { userId }): AppState => {
    return {
      ...state,
      userId,
    };
  })
);

export const appFeature = createFeature({
  name: 'app',
  reducer,
});
