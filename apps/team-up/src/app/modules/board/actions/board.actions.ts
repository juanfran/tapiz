import { createAction, props } from '@ngrx/store';
import {
  Note,
  Point,
  Image,
  Text,
  BoardActions,
  Diff,
  Zone,
  ZoneConfig,
  User,
  Board,
  PatchNode,
  AddNode,
  RemoveNode,
} from '@team-up/board-commons';

export const initBoard = createAction(BoardActions.initBoard);
export const closeBoard = createAction(BoardActions.closeBoard);

export const fetchRoomSuccess = createAction(
  BoardActions.fetchRoomSuccess,
  props<{ owners: string[]; name: string }>()
);

export const joinRoom = createAction(
  BoardActions.joinRoom,
  props<{ roomId: string }>()
);

export const setZoom = createAction(
  BoardActions.setZoom,
  props<{ zoom: number }>()
);

export const setUserView = createAction(
  BoardActions.setUserView,
  props<{ zoom: number; position: Point }>()
);

export const setBoardName = createAction(
  BoardActions.setBoardName,
  props<{ name: string }>()
);

export const setImagePosition = createAction(
  BoardActions.setImagePosition,
  props<{ id: Image['id']; position: Image['position'] }>()
);

export const setDrawEnabled = createAction(
  BoardActions.setDrawEnabled,
  props<{ enabled: boolean }>()
);

export const setCanvasActive = createAction(
  BoardActions.setCanvasActive,
  props<{ active: boolean }>()
);

export const setMoveEnabled = createAction(
  BoardActions.setMoveEnabled,
  props<{ enabled: boolean }>()
);

export const newImage = createAction(
  BoardActions.newImage,
  props<{ image: Image }>()
);

export const removeImage = createAction(
  BoardActions.removeImage,
  props<{ id: Image['id'] }>()
);

export const editImage = createAction(
  BoardActions.editImage,
  props<{ id: string; data: Partial<Image> }>()
);

export const newText = createAction(
  BoardActions.newText,
  props<{ text: Text }>()
);

export const removeText = createAction(
  BoardActions.removeText,
  props<{ id: Text['id'] }>()
);

export const wsSetState = createAction(
  BoardActions.wsSetState,
  props<{ id: string; data: Diff }>()
);

export const newPath = createAction(
  BoardActions.newPath,
  props<{ path: fabric.Point[] }>()
);

export const moveCursor = createAction(
  BoardActions.moveCursor,
  props<{ userId?: string; cursor: Point }>()
);

export const setUserId = createAction(
  BoardActions.setUserId,
  props<{ userId: string }>()
);

export const setInitZone = createAction(
  BoardActions.setInitZone,
  props<{ initZone: ZoneConfig | null }>()
);

export const setFocusId = createAction(
  BoardActions.setFocusId,
  props<{ focusId: string }>()
);

export const setVisible = createAction(
  BoardActions.setVisible,
  props<{ visible: boolean }>()
);

export const changeBrushSize = createAction(
  BoardActions.changeBrushSize,
  props<{ brushSize: number }>()
);

export const changeCanvasMode = createAction(
  BoardActions.changeCanvasMode,
  props<{ canvasMode: string }>()
);

export const changeBrushColor = createAction(
  BoardActions.changeBrushColor,
  props<{ brushColor: string }>()
);

export const setZone = createAction(
  BoardActions.setZone,
  props<{ zone: Zone | null }>()
);

export const zoneToGroup = createAction(BoardActions.zoneToGroup);

export const zoneToPanel = createAction(BoardActions.zoneToPanel);

export const patchNode = createAction(
  BoardActions.patchNode,
  props<PatchNode>()
);

export const addNode = createAction(BoardActions.addNode, props<AddNode>());
export const removeNode = createAction(
  BoardActions.removeNode,
  props<RemoveNode>()
);

export const initDragNode = createAction(
  BoardActions.initDragNode,
  props<PatchNode>()
);

export const endDragNode = createAction(
  BoardActions.endDragNode,
  props<{
    id: string;
    nodeType: 'notes' | 'panels' | 'groups' | 'images' | 'texts';
    initialPosition: Point;
    finalPosition: Point;
  }>()
);

export const undo = createAction(BoardActions.undo);

export const redo = createAction(BoardActions.redo);

export const toggleUserHighlight = createAction(
  BoardActions.toggleUserHighlight,
  props<{ id: User['id'] }>()
);

export const setPopupOpen = createAction(
  BoardActions.setPopupOpen,
  props<{ popup: string }>()
);
export const createBoard = createAction(
  BoardActions.createBoard,
  props<{ name: string }>()
);

export const fetchBoards = createAction(BoardActions.fetchBoards);

export const fetchBoardsSuccess = createAction(
  BoardActions.fetchBoardsSuccess,
  props<{ boards: Board[] }>()
);

export const textToolbarClick = createAction(BoardActions.textToolbarClick);

export const readyToVote = createAction(BoardActions.readyToVote);

export const removeBoard = createAction(
  BoardActions.removeBoard,
  props<{ id: Board['id'] }>()
);
