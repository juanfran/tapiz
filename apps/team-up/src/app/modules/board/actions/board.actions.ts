import { props, createAction } from '@ngrx/store';
import {
  AddNode,
  Diff,
  PatchNode,
  Point,
  RemoveNode,
  BoardCommonActions,
} from '@team-up/board-commons';

export const BoardActions = {
  setBoardName: createAction(
    BoardCommonActions.setBoardName,
    props<{ name: string }>()
  ),
  moveCursor: createAction(
    BoardCommonActions.moveCursor,
    props<{ cursor: Point }>()
  ),
  patchNode: createAction(BoardCommonActions.patchNode, props<PatchNode>()),
  addNode: createAction(BoardCommonActions.addNode, props<AddNode>()),
  removeNode: createAction(BoardCommonActions.removeNode, props<RemoveNode>()),
  setVisible: createAction(
    BoardCommonActions.setVisible,
    props<{ visible: boolean }>()
  ),
  wsSetState: createAction(
    BoardCommonActions.wsSetState,
    props<{ id: string; data: Diff }>()
  ),
};
