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
  selectCanvasMode,
  selectZone,
  selectUserHighlight,
  selectPopupOpen,
  selectBoardId,
  selectIsAdmin,
  selectBoardCursor,
  selectVoting,
  selectEmoji,
  selectPageState,
  selectDragEnabled,
  selectDrawing,
  selectDrawingColor,
  selectDrawingSize,
  selectCocomaterial,
  selectSearching,
  selectShowUserVotes,
} = pageFeature;

export const isFocus = (id: string) => {
  return createSelector(selectFocusId, (focusId) => focusId.includes(id));
};

export const isUserHighlighActive = () => {
  return createSelector(
    selectUserHighlight,
    selectShowUserVotes,
    (id, userVotes) => {
      return id ? !!id : !!userVotes;
    },
  );
};

export const isUserHighlighted = (userId: string) => {
  return createSelector(selectUserHighlight, (id) => {
    return id === userId;
  });
};
