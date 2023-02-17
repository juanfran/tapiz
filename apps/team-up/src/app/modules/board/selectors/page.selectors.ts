import { createSelector } from '@ngrx/store';
import { pageFeature } from '../reducers/page.reducer';

export const {
  selectZoom,
  selectPosition,
  selectMoveEnabled,
  selectOpen,
  selectUserId,
  selectInitZone,
  selectFocusId,
  selectVisible,
  selectCanvasMode,
  selectZone,
  selectUserHighlight,
  selectPopupOpen,
  selectBoards,
  selectBoardId,
  selectIsOwner,
  selectBoardCursor,
  selectVoting,
  selectPageState,
} = pageFeature;

export const isFocus = (id: string) => {
  return createSelector(selectFocusId, (focusId) => id === focusId);
};

export const isUserHighlighActive = () => {
  return createSelector(selectUserHighlight, (id) => {
    return !!id;
  });
};

export const isUserHighlighted = (userId: string) => {
  return createSelector(selectUserHighlight, (id) => {
    return id === userId;
  });
};
