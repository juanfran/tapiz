import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import {
  Point,
  User,
  CocomaterialTag,
  CocomaterialApiListVectors,
} from '@tapiz/board-commons';
import { wsOpen } from '../../ws/ws.actions';
import { BoardActions } from '../actions/board.actions';
import { PageActions } from '../actions/page.actions';
import type { NativeEmoji } from 'emoji-picker-element/shared';

export interface PageState {
  name: string;
  loaded: boolean;
  focusId: string[];
  open: boolean;
  userId: string;
  boardId: string;
  zoom: number;
  position: Point;
  moveEnabled: boolean;
  nodeSelection: boolean;
  userHighlight: User['id'] | null;
  showUserVotes: User['id'] | null;
  boardMode: number;
  popupOpen: string;
  isAdmin: boolean;
  privateId: string;
  owners: string[];
  boardCursor: string;
  voting: boolean;
  emoji: NativeEmoji | null;
  dragEnabled: boolean;
  cocomaterial: {
    page: number;
    tags: CocomaterialTag[];
    vectors: CocomaterialApiListVectors | null;
  };
  searching: boolean;
  additionalContext: Record<string, unknown>;
  follow: string;
  isPublic: boolean;
  loadingBar: boolean;
  teamName: string | null;
  teamId: string | null;
  panInProgress: boolean;
  addToBoardInProcess: boolean;
  dragInProgress: boolean;
}

const initialPageState: PageState = {
  name: '',
  loaded: false,
  focusId: [],
  open: false,
  boardId: '',
  zoom: 1,
  position: {
    x: 0,
    y: 0,
  },
  moveEnabled: false,
  nodeSelection: true,
  userHighlight: null,
  showUserVotes: null,
  boardMode: 0,
  popupOpen: '',
  isAdmin: false,
  privateId: '',
  owners: [],
  boardCursor: 'default',
  voting: false,
  userId: '',
  emoji: null,
  dragEnabled: true,
  cocomaterial: {
    page: 1,
    tags: [],
    vectors: null,
  },
  searching: false,
  additionalContext: {},
  follow: '',
  isPublic: false,
  loadingBar: false,
  teamName: null,
  teamId: null,
  panInProgress: false,
  addToBoardInProcess: false,
  dragInProgress: false,
};

const reducer = createReducer(
  initialPageState,
  on(wsOpen, (state): PageState => {
    return {
      ...state,
      open: true,
    };
  }),
  on(PageActions.initBoard, (state, { userId }): PageState => {
    return {
      ...initialPageState,
      // could be 1 because the session variable `new-board`
      boardMode: state.boardMode,
      userId,
    };
  }),
  on(PageActions.closeBoard, (state): PageState => {
    return {
      ...initialPageState,
      userId: state.userId,
    };
  }),
  on(BoardActions.setBoardName, (state, { name }): PageState => {
    return {
      ...state,
      name,
    };
  }),
  on(
    PageActions.fetchBoardSuccess,
    (
      state,
      { isAdmin, isPublic, name, privateId, teamName, teamId },
    ): PageState => {
      return {
        ...state,
        name,
        isAdmin,
        isPublic,
        privateId,
        loaded: true,
        moveEnabled: true,
        teamName,
        teamId,
      };
    },
  ),
  on(PageActions.joinBoard, (state, { boardId }): PageState => {
    return {
      ...state,
      boardId,
    };
  }),
  on(PageActions.setUserView, (state, { zoom, position }): PageState => {
    return {
      ...state,
      zoom,
      position,
    };
  }),
  on(PageActions.setMoveEnabled, (state, { enabled }): PageState => {
    return {
      ...state,
      moveEnabled: enabled,
    };
  }),
  on(BoardActions.batchNodeActions, (state, { actions }): PageState => {
    if (actions.length === 1) {
      const action = actions[0];

      if (action.op === 'add') {
        if (action.data.type === 'group' || action.data.type === 'panel') {
          state = {
            ...state,
            moveEnabled: true,
          };
        }
      }
    }

    actions.forEach((action) => {
      if (action.op === 'remove') {
        const id = action.data.id;

        if (state.focusId.includes(id)) {
          state = {
            ...state,
            focusId: state.focusId.filter((it) => it !== id),
          };
        }
      }
    });

    return {
      ...state,
    };
  }),
  on(PageActions.selectNodes, (state, { ids }): PageState => {
    return {
      ...state,
      focusId: ids,
      moveEnabled: true,
    };
  }),
  on(
    PageActions.setFocusId,
    (state, { focusId, ctrlKey = false }): PageState => {
      if (focusId && state.focusId.includes(focusId)) {
        return state;
      }

      if (ctrlKey) {
        state = {
          ...state,
          focusId: [...state.focusId.filter((it) => !!it), focusId],
        };
      } else {
        state = {
          ...state,
          focusId: [focusId],
        };
      }

      return state;
    },
  ),
  on(PageActions.changeBoardMode, (state, { boardMode }): PageState => {
    return {
      ...state,
      boardMode,
      focusId: [],
    };
  }),
  on(PageActions.toggleUserHighlight, (state, { id }): PageState => {
    state = {
      ...state,
    };

    state.showUserVotes = null;

    if (state.userHighlight === id) {
      state.userHighlight = null;
    } else {
      state.userHighlight = id;
    }

    return state;
  }),
  on(PageActions.toggleShowVotes, (state, { userId }): PageState => {
    state = {
      ...state,
    };

    state.userHighlight = null;

    if (state.showUserVotes === userId) {
      state.showUserVotes = null;
    } else {
      state.showUserVotes = userId;
    }

    return state;
  }),
  on(PageActions.stopHighlight, (state): PageState => {
    return {
      ...state,
      userHighlight: null,
      showUserVotes: null,
    };
  }),
  on(PageActions.setPopupOpen, (state, { popup }): PageState => {
    state = {
      ...state,
    };

    state.popupOpen = popup;

    state.emoji = null;
    state.boardCursor = 'default';
    state.voting = false;
    state.dragEnabled = true;
    state.searching = false;
    state.nodeSelection = true;
    state.addToBoardInProcess = false;

    return state;
  }),
  on(PageActions.readyToVote, (state): PageState => {
    return {
      ...state,
      voting: state.voting ? false : true,
    };
  }),
  on(PageActions.selectEmoji, (state, { emoji }): PageState => {
    return {
      ...state,
      emoji: emoji,
    };
  }),
  on(PageActions.fetchCocomaterialTagsSuccess, (state, { tags }): PageState => {
    return {
      ...state,
      cocomaterial: {
        ...state.cocomaterial,
        tags,
      },
    };
  }),
  on(PageActions.fetchVectorsSuccess, (state, { vectors, page }): PageState => {
    state = {
      ...state,
    };

    if (page === 1) {
      state.cocomaterial = {
        ...state.cocomaterial,
        vectors,
      };
    } else if (state.cocomaterial.vectors) {
      state.cocomaterial = {
        ...state.cocomaterial,
        vectors: {
          ...vectors,
          results: [...state.cocomaterial.vectors.results, ...vectors.results],
        },
      };
    }

    state.cocomaterial.page = page;

    return state;
  }),
  on(PageActions.readyToSearch, (state): PageState => {
    return {
      ...state,
      searching: true,
    };
  }),
  on(PageActions.pasteNodesSuccess, (state, { nodes }): PageState => {
    state = {
      ...state,
    };

    state.additionalContext = {
      ...state.additionalContext,
    };

    nodes.forEach((it) => {
      state.additionalContext[it.data.id] = 'pasted';
    });

    state.focusId = nodes.map((it) => it.data.id);

    return state;
  }),
  on(PageActions.followUser, (state, { id }): PageState => {
    state = {
      ...state,
    };

    if (state.follow === id) {
      state.follow = '';
    } else {
      state.follow = id;
    }

    if (state.follow) {
      state.moveEnabled = false;
    } else {
      state.moveEnabled = true;
    }

    return state;
  }),
  on(PageActions.setBoardPrivacy, (state, { isPublic }): PageState => {
    return {
      ...state,
      isPublic,
    };
  }),
  on(PageActions.lockBoard, (state, { lock }): PageState => {
    if (lock) {
      return {
        ...state,
        moveEnabled: false,
        dragEnabled: false,
      };
    }

    return {
      ...state,
      moveEnabled: true,
      dragEnabled: true,
    };
  }),
  on(PageActions.drawing, (state, { drawing }): PageState => {
    return {
      ...state,
      dragEnabled: !drawing,
    };
  }),
  on(PageActions.setBoardCursor, (state, { cursor }): PageState => {
    return {
      ...state,
      boardCursor: cursor,
    };
  }),
  on(PageActions.setNodeSelection, (state, { enabled }): PageState => {
    return {
      ...state,
      nodeSelection: enabled,
    };
  }),
  on(PageActions.setLoadingBar, (state, { loadingBar }): PageState => {
    return {
      ...state,
      loadingBar,
    };
  }),
  on(PageActions.panInProgress, (state, { panInProgress }): PageState => {
    return {
      ...state,
      panInProgress,
    };
  }),
  on(PageActions.addToBoardInProcess, (state, { inProcess }): PageState => {
    return {
      ...state,
      addToBoardInProcess: inProcess,
    };
  }),
  on(PageActions.dragInProgress, (state, { inProgress }): PageState => {
    return {
      ...state,
      dragInProgress: inProgress,
    };
  }),
);

export const pageFeature = createFeature({
  name: 'page',
  reducer,
  extraSelectors: ({
    selectBoardCursor,
    selectAddToBoardInProcess,
    selectPanInProgress,
    selectDragInProgress,
    selectNodeSelection,
  }) => ({
    selectIsNodeSelectionEnabled: createSelector(
      selectNodeSelection,
      selectAddToBoardInProcess,
      selectPanInProgress,
      (nodeSelection, addToBoardInProgress, panInProgress) => {
        return nodeSelection && !addToBoardInProgress && !panInProgress;
      },
    ),
    selectCurrentBoardCursor: createSelector(
      selectBoardCursor,
      selectAddToBoardInProcess,
      selectPanInProgress,
      selectDragInProgress,
      (boardCursor, addToBoardInProgress, panInProgress, dragInProgress) => {
        if (dragInProgress) {
          return 'grabbing';
        }

        if (panInProgress) {
          return 'grab';
        }

        if (addToBoardInProgress) {
          return 'crosshair';
        }

        return boardCursor;
      },
    ),
  }),
});
