import { Action, createFeature, createReducer, on } from '@ngrx/store';
import { BoardCommonActions, getDiff } from '@team-up/board-commons';
import { PageActions } from '../actions/page.actions';
import {
  Note,
  Image,
  User,
  applyDiff,
  Group,
  Panel,
  Text,
  Vector,
} from '@team-up/board-commons';
import { produce, enablePatches } from 'immer';
import { BoardActions } from '../actions/board.actions';

enablePatches();

export interface BoardState {
  name: string;
  notes: Note[];
  images: Image[];
  users: User[];
  groups: Group[];
  panels: Panel[];
  texts: Text[];
  vectors: Vector[];
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
  on(
    BoardActions.addNode,
    BoardActions.removeNode,
    BoardActions.patchNode,
    (state, action): BoardState => {
      const diff = getDiff(action);

      if (diff) {
        const result = applyDiff(diff, state);

        return {
          ...state,
          ...result,
        };
      }

      return state;
    }
  ),
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

    return {
      ...state,
      ...applyDiff(data, commonState),
    };
  }),
  on(PageActions.pasteNodes, (state, { nodes }): BoardState => {
    nodes.forEach((node) => {
      const diff = getDiff(BoardActions.addNode(node));

      if (diff) {
        const result = applyDiff(diff, state);

        state = {
          ...state,
          ...result,
        };
      }
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
