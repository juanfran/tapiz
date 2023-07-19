import { props, createAction } from '@ngrx/store';
import {
  Diff,
  BoardCommonActions,
  BachStateActions,
  Point,
} from '@team-up/board-commons';

export const BoardActions = {
  setBoardName: createAction(
    BoardCommonActions.setBoardName,
    props<{ name: string }>()
  ),
  batchNodeActions: createAction(
    BoardCommonActions.batchNodeActions,
    props<BachStateActions>()
  ),
  setVisible: createAction(
    BoardCommonActions.setVisible,
    props<{ visible: boolean }>()
  ),
  moveUser: createAction(
    BoardCommonActions.moveUser,
    props<{ position: Point; cursor: Point }>()
  ),
  setState: createAction(BoardCommonActions.setState, props<{ data: Diff }>()),
};
