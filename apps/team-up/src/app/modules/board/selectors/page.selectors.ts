import { createSelector } from '@ngrx/store';
import { pageFeature } from '../reducers/page.reducer';

export const {
  selectZoom,
  selectPosition,
  selectMoveEnabled,
  selectOpen,
  selectUserId,
  selectFocusId,
  selectCanvasMode,
  selectUserHighlight,
  selectPopupOpen,
  selectBoardId,
  selectIsAdmin,
  selectVoting,
  selectEmoji,
  selectPageState,
  selectDragEnabled,
  selectCocomaterial,
  selectSearching,
  selectShowUserVotes,
  selectPrivateId,
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

export const selectLayer = createSelector(selectCanvasMode, (canvasMode) => {
  return canvasMode === 'editMode' ? 0 : 1;
});
