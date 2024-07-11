/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionReducer, MetaReducer } from '@ngrx/store';
import { addLog } from './debug';

export function debug(reducer: ActionReducer<any>): ActionReducer<any> {
  return function (state, action) {
    addLog('ngrx', action, state);

    return reducer(state, action);
  };
}

export const debugMetaReducers: MetaReducer<any>[] = [debug];
