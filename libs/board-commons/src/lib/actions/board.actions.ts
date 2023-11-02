import { props, createAction } from '@ngrx/store';
import {
  BoardCommonActions,
  BachStateActions,
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
  setState: createAction(
    BoardCommonActions.setState,
    props<{ data: StateActions[] }>()
  ),
};
