import { Action, createFeature, createReducer, on } from '@ngrx/store';
import { Board } from '@team-up/board-commons';
import produce from 'immer';
import { HomeActions } from './home.actions';

export interface HomeState {
  boards: Board[];
}

const initialHomeState: HomeState = {
  boards: [],
};

const reducer = createReducer(
  initialHomeState,
  on(HomeActions.fetchBoardsSuccess, (state, { boards }): HomeState => {
    state.boards = boards;

    return state;
  }),
  on(
    HomeActions.removeBoard,
    HomeActions.leaveBoard,
    (state, { id }): HomeState => {
      state.boards = state.boards.filter((board) => {
        return board.id !== id;
      });

      return state;
    }
  )
);

export const homeFeature = createFeature({
  name: 'home',
  reducer: (state: HomeState = initialHomeState, action: Action) => {
    return produce(state, (draft: HomeState) => {
      return reducer(draft, action);
    });
  },
});
