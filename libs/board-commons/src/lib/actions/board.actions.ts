import { props, createAction } from '@ngrx/store';
import { BoardCommonActions } from '../board-common-actions';
import { BachStateActions, StateActions } from '../models/node.model';

export const BoardActions = {
  setBoardName: createAction(
    BoardCommonActions.setBoardName,
    props<{ name: string }>(),
  ),
  batchNodeActions: createAction(
    BoardCommonActions.batchNodeActions,
    props<BachStateActions>(),
  ),
  setState: createAction(
    BoardCommonActions.setState,
    props<{ data: StateActions[] }>(),
  ),
};
