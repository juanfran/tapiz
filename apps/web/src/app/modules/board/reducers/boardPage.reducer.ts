import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import {
  Point,
  User,
  CocomaterialTag,
  CocomaterialApiListVectors,
  BoardUserInfo,
} from '@tapiz/board-commons';
import { wsOpen } from '../../ws/ws.actions';
import { BoardActions } from '../actions/board.actions';
import { BoardPageActions } from '../actions/board-page.actions';
import type { NativeEmoji } from 'emoji-picker-element/shared';

export interface BoardPageState {
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
  boardUsers: BoardUserInfo[];
  mentions: { id: User['id']; name: User['name'] }[];
}

const initialPageState: BoardPageState = {
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
  boardUsers: [],
  mentions: [],
};

const reducer = createReducer(
  initialPageState,
  on(wsOpen, (state): BoardPageState => {
    return {
      ...state,
      open: true,
    };
  }),
  on(BoardPageActions.initBoard, (state, { userId }): BoardPageState => {
    return {
      ...initialPageState,
      // could be 1 because the session variable `new-board`
      boardMode: state.boardMode,
      userId,
    };
  }),
  on(BoardPageActions.closeBoard, (state): BoardPageState => {
    return {
      ...initialPageState,
      userId: state.userId,
    };
  }),
  on(BoardActions.setBoardName, (state, { name }): BoardPageState => {
    return {
      ...state,
      name,
    };
  }),
  on(
    BoardPageActions.fetchBoardSuccess,
    (
      state,
      { isAdmin, isPublic, name, privateId, teamName, teamId },
    ): BoardPageState => {
      return {
        ...state,
        name,
        isAdmin,
        isPublic,
        privateId,
        moveEnabled: true,
        teamName,
        teamId,
      };
    },
  ),
  on(BoardPageActions.boardLoaded, (state): BoardPageState => {
    return {
      ...state,
      loaded: true,
    };
  }),
  on(BoardPageActions.joinBoard, (state, { boardId }): BoardPageState => {
    return {
      ...state,
      boardId,
    };
  }),
  on(
    BoardPageActions.setUserView,
    (state, { zoom, position }): BoardPageState => {
      return {
        ...state,
        zoom,
        position,
      };
    },
  ),
  on(BoardPageActions.setMoveEnabled, (state, { enabled }): BoardPageState => {
    return {
      ...state,
      moveEnabled: enabled,
    };
  }),
  on(BoardActions.batchNodeActions, (state, { actions }): BoardPageState => {
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
  on(BoardPageActions.selectNodes, (state, { ids }): BoardPageState => {
    return {
      ...state,
      focusId: ids,
      moveEnabled: true,
    };
  }),
  on(
    BoardPageActions.setFocusId,
    (state, { focusId, ctrlKey = false }): BoardPageState => {
      if (!focusId) {
        return {
          ...state,
          focusId: [],
        };
      }

      if (focusId && state.focusId.includes(focusId) && !ctrlKey) {
        return state;
      }

      if (ctrlKey) {
        if (state.focusId.includes(focusId)) {
          state = {
            ...state,
            focusId: state.focusId.filter((it) => it !== focusId),
          };
        } else {
          state = {
            ...state,
            focusId: [...state.focusId.filter((it) => !!it), focusId],
          };
        }
      } else {
        state = {
          ...state,
          focusId: [focusId],
        };
      }

      return state;
    },
  ),
  on(
    BoardPageActions.changeBoardMode,
    (state, { boardMode }): BoardPageState => {
      return {
        ...state,
        boardMode,
        focusId: [],
      };
    },
  ),
  on(BoardPageActions.toggleUserHighlight, (state, { id }): BoardPageState => {
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
  on(BoardPageActions.toggleShowVotes, (state, { userId }): BoardPageState => {
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
  on(BoardPageActions.stopHighlight, (state): BoardPageState => {
    return {
      ...state,
      userHighlight: null,
      showUserVotes: null,
    };
  }),
  on(BoardPageActions.setPopupOpen, (state, { popup }): BoardPageState => {
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
  on(BoardPageActions.readyToVote, (state): BoardPageState => {
    return {
      ...state,
      voting: state.voting ? false : true,
    };
  }),
  on(BoardPageActions.selectEmoji, (state, { emoji }): BoardPageState => {
    return {
      ...state,
      emoji: emoji,
    };
  }),
  on(
    BoardPageActions.fetchCocomaterialTagsSuccess,
    (state, { tags }): BoardPageState => {
      return {
        ...state,
        cocomaterial: {
          ...state.cocomaterial,
          tags,
        },
      };
    },
  ),
  on(
    BoardPageActions.fetchVectorsSuccess,
    (state, { vectors, page }): BoardPageState => {
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
            results: [
              ...state.cocomaterial.vectors.results,
              ...vectors.results,
            ],
          },
        };
      }

      state.cocomaterial.page = page;

      return state;
    },
  ),
  on(BoardPageActions.readyToSearch, (state): BoardPageState => {
    return {
      ...state,
      searching: true,
    };
  }),
  on(BoardPageActions.pasteNodesSuccess, (state, { nodes }): BoardPageState => {
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
  on(BoardPageActions.followUser, (state, { id }): BoardPageState => {
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
  on(
    BoardPageActions.setBoardPrivacy,
    (state, { isPublic }): BoardPageState => {
      return {
        ...state,
        isPublic,
      };
    },
  ),
  on(
    BoardPageActions.lockBoard,
    (state, { lock }): BoardPageState => ({
      ...state,
      moveEnabled: !lock,
      dragEnabled: !lock,
    }),
  ),
  on(
    BoardPageActions.setDragEnabled,
    (state, { dragEnabled }): BoardPageState => ({
      ...state,
      dragEnabled,
    }),
  ),
  on(BoardPageActions.setBoardCursor, (state, { cursor }): BoardPageState => {
    return {
      ...state,
      boardCursor: cursor,
    };
  }),
  on(
    BoardPageActions.setNodeSelection,
    (state, { enabled }): BoardPageState => {
      return {
        ...state,
        nodeSelection: enabled,
      };
    },
  ),
  on(
    BoardPageActions.setLoadingBar,
    (state, { loadingBar }): BoardPageState => {
      return {
        ...state,
        loadingBar,
      };
    },
  ),
  on(
    BoardPageActions.panInProgress,
    (state, { panInProgress }): BoardPageState => {
      return {
        ...state,
        panInProgress,
      };
    },
  ),
  on(
    BoardPageActions.addToBoardInProcess,
    (state, { inProcess }): BoardPageState => {
      return {
        ...state,
        addToBoardInProcess: inProcess,
      };
    },
  ),
  on(
    BoardPageActions.dragInProgress,
    (state, { inProgress }): BoardPageState => {
      return {
        ...state,
        dragInProgress: inProgress,
      };
    },
  ),
  on(BoardPageActions.setBoardUsers, (state, { users }): BoardPageState => {
    return {
      ...state,
      boardUsers: users,
    };
  }),
  on(
    BoardPageActions.fetchMentionsSuccess,
    (state, { mentions }): BoardPageState => {
      return {
        ...state,
        mentions,
      };
    },
  ),
);

export const boardPageFeature = createFeature({
  name: 'boardPage',
  reducer,
  extraSelectors: ({
    selectBoardCursor,
    selectAddToBoardInProcess,
    selectPanInProgress,
    selectDragInProgress,
    selectNodeSelection,
    selectMoveEnabled,
    selectFollow,
    selectUserHighlight,
    selectShowUserVotes,
    selectFocusId,
  }) => ({
    isFocus: (id: string) => {
      return createSelector(selectFocusId, (focusId) => focusId.includes(id));
    },
    isUserHighlighted: (userId: string) => {
      return createSelector(selectUserHighlight, (id) => id === userId);
    },
    isUserHighlighActive: createSelector(
      selectUserHighlight,
      selectShowUserVotes,
      (id, userVotes) => {
        return id ? !!id : !!userVotes;
      },
    ),
    selectMoveEnabled: createSelector(
      selectMoveEnabled,
      selectFollow,
      (moveEnabled, follow) => {
        return moveEnabled && !follow;
      },
    ),
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
