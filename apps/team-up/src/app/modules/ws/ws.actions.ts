import { createAction, props } from '@ngrx/store';

export const wsMessage = createAction(
  '[Ws] message',
  props<{ messages: { [key in PropertyKey]: unknown }[] }>()
);

export const wsOpen = createAction('[Ws] open');
