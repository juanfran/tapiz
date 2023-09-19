import { createFeature, createReducer, on } from '@ngrx/store';
import { PageActions } from '../actions/page.actions';
import { applyDiff, CommonState } from '@team-up/board-commons';
import { BoardActions } from '../actions/board.actions';
export interface BoardState extends CommonState {
  name: string;
}

const initialBoardState: BoardState = {
  name: '',
  users: [],
  nodes: [],
};

const reducer = createReducer(
  initialBoardState,
  on(PageActions.initBoard, PageActions.closeBoard, (state): BoardState => {
    return {
      ...state,
      ...initialBoardState,
    };
  }),

  on(
    BoardActions.setBoardName,
    PageActions.fetchBoardSuccess,
    (state, { name }): BoardState => {
      return {
        ...state,
        name,
      };
    }
  ),
  on(BoardActions.batchNodeActions, (state, action): BoardState => {
    action.actions;

    if (action.actions.length) {
      const result = action.actions.reduce((acc, actionOp) => {
        return {
          ...acc,
          ...applyDiff(actionOp, acc),
        };
      }, state);

      return {
        ...state,
        ...result,
      };
    }

    return state;
  }),
  on(BoardActions.setState, (state, { data }): BoardState => {
    const commonState = {
      users: state.users,
      nodes: state.nodes,
    };

    const newState = data.reduce((acc, action) => {
      return applyDiff(action, acc);
    }, commonState);

    return {
      ...state,
      ...newState,
    };
  }),
  on(PageActions.pasteNodes, (state, { nodes }): BoardState => {
    nodes.forEach((node) => {
      const result = applyDiff(
        {
          op: 'add',
          data: node,
        },
        state
      );

      state = {
        ...state,
        ...result,
      };
    });

    return state;
  })
);

export const boardFeature = createFeature({
  name: 'board',
  reducer,
});
