import { Action, createFeature, createReducer, on } from '@ngrx/store';
import * as BoardActions from '../actions/board.actions';
import {
  Note,
  Point,
  Image,
  User,
  applyDiff,
  Group,
  Zone,
  Panel,
  ZoneConfig,
  Board,
  Text,
} from '@team-up/board-commons';
import { wsOpen } from '@/app/modules/ws/ws.actions';
import { produce, enablePatches } from 'immer';

enablePatches();

export interface BoardState {
  name: string;
  visible: boolean;
  focusId: string;
  open: boolean;
  initZone: ZoneConfig | null;
  userId: string;
  roomId: string;
  zoom: number;
  position: Point;
  notes: Note[];
  moveEnabled: boolean;
  drawEnabled: boolean;
  canvasActive: boolean;
  images: Image[];
  users: User[];
  groups: Group[];
  panels: Panel[];
  brushSize: number;
  brushColor: string;
  zone: Zone | null;
  userHighlight: User['id'] | null;
  canvasMode: string;
  popupOpen: string;
  boards: Board[];
  isOwner: boolean;
  owners: string[];
  boardCursor: string;
  texts: Text[];
  voting: boolean;
  notesIndex: Record<Note['id'], number>;
}

const initialBoardState = {
  name: '',
  visible: true,
  focusId: '',
  open: false,
  initZone: null,
  roomId: '',
  zoom: 1,
  position: {
    x: 0,
    y: 0,
  },
  notes: [],
  images: [],
  users: [],
  groups: [],
  panels: [],
  brushSize: 2,
  brushColor: '#000000',
  moveEnabled: true,
  drawEnabled: false,
  canvasActive: false,
  zone: null,
  userHighlight: null,
  canvasMode: 'editMode',
  popupOpen: '',
  removed: [],
  isOwner: false,
  owners: [],
  boardCursor: 'default',
  texts: [],
  voting: false,
  notesIndex: {},
};

export const initialState: BoardState = {
  userId: '',
  boards: [],
  ...initialBoardState,
};
const reducer = createReducer(
  initialState,
  on(wsOpen, (state): BoardState => {
    state.open = true;
    return state;
  }),
  on(BoardActions.initBoard, BoardActions.closeBoard, (state): BoardState => {
    return {
      ...state,
      ...initialBoardState,
    };
  }),
  on(BoardActions.fetchRoomSuccess, (state, { name, owners }): BoardState => {
    state.name = name;
    state.owners = owners;

    if (state.userId) {
      state.isOwner = state.owners.includes(state.userId);
    }

    return state;
  }),
  on(BoardActions.setUserId, (state, { userId }): BoardState => {
    state.userId = userId;

    return state;
  }),
  on(BoardActions.setBoardName, (state, { name }): BoardState => {
    state.name = name;

    return state;
  }),
  on(BoardActions.joinRoom, (state, { roomId }): BoardState => {
    state.roomId = roomId;

    return state;
  }),
  on(BoardActions.setZoom, (state, { zoom }): BoardState => {
    state.zoom = zoom;

    return state;
  }),
  on(BoardActions.setUserView, (state, { zoom, position }): BoardState => {
    state.zoom = zoom;
    state.position = position;

    return state;
  }),
  on(BoardActions.setVisible, (state, { visible }): BoardState => {
    state.visible = visible;

    return state;
  }),
  on(BoardActions.setDrawEnabled, (state, { enabled }): BoardState => {
    state.drawEnabled = enabled;

    return state;
  }),
  on(BoardActions.setCanvasActive, (state, { active }): BoardState => {
    state.canvasActive = active;

    return state;
  }),
  on(BoardActions.setMoveEnabled, (state, { enabled }): BoardState => {
    state.moveEnabled = enabled;

    return state;
  }),
  on(BoardActions.setInitZone, (state, { initZone }): BoardState => {
    state.initZone = initZone;

    return state;
  }),
  on(BoardActions.addNode, (state, { node, nodeType }): BoardState => {
    if (nodeType === 'group' || nodeType === 'panel') {
      state.initZone = null;
      state.moveEnabled = true;
      state.zone = null;
    }

    if (nodeType === 'note') {
      state.notes.push(node);
    } else if (nodeType === 'group') {
      state.groups.push(node);
    } else if (nodeType === 'panel') {
      state.panels.push(node);
    } else if (nodeType === 'image') {
      state.images.push({
        ...node,
        position: {
          x: (-state.position.x + node.position.x) / state.zoom,
          y: (-state.position.y + node.position.y) / state.zoom,
        },
      });
    } else if (nodeType === 'text') {
      state.texts.push(node);
    }

    return state;
  }),
  on(BoardActions.removeNode, (state, { node, nodeType }): BoardState => {
    const id = node.id;

    if (id === state.focusId) {
      state.focusId = '';
    }

    if (nodeType === 'note') {
      state.notes = state.notes.filter((note) => note.id !== id);
    } else if (nodeType === 'group') {
      state.groups = state.groups.filter((group) => group.id !== id);
    } else if (nodeType === 'panel') {
      state.panels = state.panels.filter((panel) => panel.id !== id);
    } else if (nodeType === 'image') {
      state.images = state.images.filter((image) => image.id !== id);
    } else if (nodeType === 'text') {
      state.texts = state.texts.filter((text) => text.id !== id);
    }

    return state;
  }),
  on(BoardActions.patchNode, (state, { node, nodeType }): BoardState => {
    (state[nodeType] as unknown) = state[nodeType].map((it) => {
      if (it.id === node.id) {
        return {
          ...it,
          ...node,
        };
      }

      return it;
    });

    if (nodeType === 'notes' && node.position) {
      const index = state.notes.findIndex((it) => node.id === it.id);

      if (index !== -1) {
        state.notes.push(state.notes.splice(index, 1)[0]);
      }
    }

    return state;
  }),
  on(BoardActions.setFocusId, (state, { focusId }): BoardState => {
    state.focusId = focusId;

    return state;
  }),
  on(BoardActions.setZone, (state, { zone }): BoardState => {
    state.zone = zone;

    return state;
  }),
  on(BoardActions.wsSetState, (state, { data }): BoardState => {
    const commonState = {
      notes: state.notes,
      users: state.users,
      groups: state.groups,
      panels: state.panels,
      images: state.images,
      texts: state.texts,
    };

    const currentUser = data.set?.users?.find((it) => it.id === state.userId);

    let visible = state.visible;

    if (currentUser) {
      visible = currentUser.visible;
    }

    return {
      ...state,
      ...applyDiff(data, commonState),
      visible,
    };
  }),
  on(BoardActions.changeBrushSize, (state, { brushSize }): BoardState => {
    state.brushSize = brushSize;

    return state;
  }),
  on(BoardActions.changeBrushColor, (state, { brushColor }): BoardState => {
    state.brushColor = brushColor;

    return state;
  }),
  on(BoardActions.changeCanvasMode, (state, { canvasMode }): BoardState => {
    state.canvasMode = canvasMode;
    state.focusId = '';

    return state;
  }),
  on(BoardActions.toggleUserHighlight, (state, { id }): BoardState => {
    if (state.userHighlight === id) {
      state.userHighlight = null;
    } else {
      state.userHighlight = id;
    }

    return state;
  }),

  on(BoardActions.setPopupOpen, (state, { popup }): BoardState => {
    state.popupOpen = popup;

    if (popup.length) {
      state.boardCursor = 'default';
      state.initZone = null;
      state.voting = false;
    }

    return state;
  }),

  on(BoardActions.fetchBoardsSuccess, (state, { boards }): BoardState => {
    state.boards = boards;

    return state;
  }),
  on(BoardActions.textToolbarClick, (state): BoardState => {
    state.boardCursor = 'text';
    return state;
  }),
  on(BoardActions.newText, (state): BoardState => {
    state.boardCursor = 'default';
    return state;
  }),
  on(BoardActions.readyToVote, (state): BoardState => {
    if (state.voting) {
      state.boardCursor = 'default';
      state.voting = false;
    } else {
      state.boardCursor = 'crosshair';
      state.voting = true;
    }
    return state;
  }),
  on(BoardActions.removeBoard, (state, { id }): BoardState => {
    state.boards = state.boards.filter((board) => {
      return board.id !== id;
    });

    return state;
  }),
);

export const boardFeature = createFeature({
  name: 'board',
  reducer: (state: BoardState = initialState, action: Action) => {
    return produce(state, (draft: BoardState) => {
      return reducer(draft, action);
    });
  },
});
