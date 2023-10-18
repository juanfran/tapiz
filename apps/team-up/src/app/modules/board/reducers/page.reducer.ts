import { createFeature, createReducer, on } from '@ngrx/store';
import {
  Point,
  ZoneConfig,
  Zone,
  User,
  CocomaterialTag,
  CocomaterialApiListVectors,
} from '@team-up/board-commons';
import { wsOpen } from '@/app/modules/ws/ws.actions';
import { BoardActions } from '../actions/board.actions';
import { PageActions } from '../actions/page.actions';
import { NativeEmoji } from 'emoji-picker-element/shared';

export interface PageState {
  name: string;
  loaded: boolean;
  visible: boolean;
  focusId: string[];
  open: boolean;
  initZone: ZoneConfig | null;
  userId: string;
  boardId: string;
  zoom: number;
  position: Point;
  moveEnabled: boolean;
  zone: Zone | null;
  userHighlight: User['id'] | null;
  showUserVotes: User['id'] | null;
  canvasMode: string;
  popupOpen: string;
  isAdmin: boolean;
  owners: string[];
  boardCursor: string;
  voting: boolean;
  emoji: NativeEmoji | null;
  dragEnabled: boolean;
  drawing: boolean;
  drawingColor: string;
  drawingSize: number;
  cocomaterial: {
    page: number;
    tags: CocomaterialTag[];
    vectors: CocomaterialApiListVectors | null;
  };
  searching: boolean;
  additionalContext: Record<string, unknown>;
  follow: string;
  isPublic: boolean;
}

const initialPageState: PageState = {
  name: '',
  loaded: false,
  visible: true,
  focusId: [],
  open: false,
  initZone: null,
  boardId: '',
  zoom: 1,
  position: {
    x: 0,
    y: 0,
  },
  moveEnabled: false,
  zone: null,
  userHighlight: null,
  showUserVotes: null,
  canvasMode: 'editMode',
  popupOpen: '',
  isAdmin: false,
  owners: [],
  boardCursor: 'default',
  voting: false,
  userId: '',
  emoji: null,
  dragEnabled: true,
  drawing: false,
  drawingColor: '#000000',
  drawingSize: 5,
  cocomaterial: {
    page: 1,
    tags: [],
    vectors: null,
  },
  searching: false,
  additionalContext: {},
  follow: '',
  isPublic: false,
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
    (state, { isAdmin, isPublic, name }): PageState => {
      return {
        ...state,
        name,
        isAdmin,
        isPublic,
        loaded: true,
        moveEnabled: true,
      };
    }
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
  on(PageActions.setInitZone, (state, { initZone }): PageState => {
    return {
      ...state,
      initZone,
    };
  }),
  on(PageActions.setMoveEnabled, (state, { enabled }): PageState => {
    return {
      ...state,
      moveEnabled: enabled,
    };
  }),
  on(BoardActions.setVisible, (state, { visible }): PageState => {
    return {
      ...state,
      visible,
    };
  }),
  on(BoardActions.batchNodeActions, (state, { actions }): PageState => {
    if (actions.length === 1) {
      const action = actions[0];

      if (action.op === 'add') {
        if (action.data.type === 'group' || action.data.type === 'panel') {
          state = {
            ...state,
            initZone: null,
            moveEnabled: true,
            zone: null,
          };
        } else if (action.data.type === 'text') {
          state = {
            ...state,
            boardCursor: 'default',
          };
        }
      } else if (action.op === 'remove') {
        const id = action.data.id;

        if (state.focusId.includes(id)) {
          state = {
            ...state,
            focusId: state.focusId.filter((it) => it !== id),
          };
        }
      }
    }
    return {
      ...state,
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
    }
  ),
  on(PageActions.setZone, (state, { zone }): PageState => {
    return {
      ...state,
      zone,
    };
  }),
  on(BoardActions.setState, (state, { data }): PageState => {
    const currentUser = data.find(
      (it) => it.data.type === 'user' && it.data.id === state.userId
    ) as User | undefined;

    let visible = state.visible;

    if (currentUser) {
      visible = currentUser.visible;
    }

    return {
      ...state,
      visible,
    };
  }),
  on(PageActions.changeCanvasMode, (state, { canvasMode }): PageState => {
    return {
      ...state,
      canvasMode,
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
    state.drawing = false;
    state.searching = false;

    if (popup.length) {
      state.initZone = null;
    }

    return state;
  }),
  on(PageActions.textToolbarClick, (state): PageState => {
    return {
      ...state,
      boardCursor: 'text',
    };
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
      boardCursor: 'crosshair',
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
  on(PageActions.readyToDraw, (state): PageState => {
    return {
      ...state,
      dragEnabled: false,
      drawing: true,
    };
  }),
  on(PageActions.readyToSearch, (state): PageState => {
    return {
      ...state,
      searching: true,
    };
  }),
  on(PageActions.setDrawingParams, (state, { size, color }): PageState => {
    return {
      ...state,
      drawingColor: color,
      drawingSize: size,
    };
  }),
  on(PageActions.pasteNodes, (state, { nodes }): PageState => {
    state = {
      ...state,
    };

    state.additionalContext = {
      ...state.additionalContext,
    };

    nodes.forEach((it) => {
      state.additionalContext[it.id] = 'pasted';
    });

    state.focusId = nodes.map((it) => it.id);

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
  })
);

export const pageFeature = createFeature({
  name: 'page',
  reducer,
});
