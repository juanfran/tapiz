import { props, createAction } from '@ngrx/store';
import {
  BoardCommonActions,
  BachStateActions,
  Point,
  StateActions,
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
    props<{ position: Point; cursor: Point; zoom: number }>()
  ),
  setState: createAction(
    BoardCommonActions.setState,
    props<{ data: StateActions[] }>()
  ),
};
