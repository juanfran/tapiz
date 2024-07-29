import { props, createAction } from '@ngrx/store';
import { BoardCommonActions } from '../board-common-actions';
import { BachStateActions, StateActions, TuNode } from '../models/node.model';

export const BoardActions = {
  broadcast: createAction(
    BoardCommonActions.broadcast,
    props<{ data: unknown }>(),
  ),
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
    props<{ data: TuNode[] }>(),
  ),
  stateAction: createAction(
    BoardCommonActions.stateAction,
    props<{ data: StateActions[] }>(),
  ),
};
