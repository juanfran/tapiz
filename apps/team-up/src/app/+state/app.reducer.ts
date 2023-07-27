import { Action, createFeature, createReducer, on } from '@ngrx/store';
import { User } from '@team-up/board-commons';
import produce from 'immer';
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
    state.userId = userId;

    return state;
  })
);

export const appFeature = createFeature({
  name: 'app',
  reducer: (state: AppState = initialAppState, action: Action) => {
    return produce(state, (draft: AppState) => {
      return reducer(draft, action);
    });
  },
});
