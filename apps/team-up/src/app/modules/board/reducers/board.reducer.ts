import { Action, createFeature, createReducer, on } from '@ngrx/store';
import { PageActions } from '../actions/page.actions';
import { applyDiff, CommonState } from '@team-up/board-commons';
import { produce, enablePatches } from 'immer';
import { BoardActions } from '../actions/board.actions';

enablePatches();

export interface BoardState extends CommonState {
  name: string;
}

const initialBoardState: BoardState = {
  name: '',
  notes: [],
  images: [],
  users: [],
  groups: [],
  panels: [],
  texts: [],
  vectors: [],
};

const reducer = createReducer(
  initialBoardState,
  on(PageActions.initBoard, PageActions.closeBoard, (state): BoardState => {
    return {
      ...state,
      ...initialBoardState,
    };
  }),
  on(PageActions.fetchBoardSuccess, (state, { name }): BoardState => {
    state.name = name;

    return state;
  }),

  on(BoardActions.setBoardName, (state, { name }): BoardState => {
    state.name = name;

    return state;
  }),
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
      notes: state.notes,
      users: state.users,
      groups: state.groups,
      panels: state.panels,
      images: state.images,
      texts: state.texts,
      vectors: state.vectors,
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
  reducer: (state: BoardState = initialBoardState, action: Action) => {
    return produce(state, (draft: BoardState) => {
      return reducer(draft, action);
    });
  },
});
