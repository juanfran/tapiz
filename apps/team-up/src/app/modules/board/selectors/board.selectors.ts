import { createSelector } from '@ngrx/store';
import { Note, User } from '@team-up/board-commons';
import { boardFeature } from '../reducers/board.reducer';

export const {
  selectZoom,
  selectPosition,
  selectNotes,
  selectMoveEnabled,
  selectDrawEnabled,
  selectImages,
  selectOpen,
  selectUserId,
  selectUsers,
  selectInitZone,
  selectGroups,
  selectFocusId,
  selectVisible,
  selectBrushSize,
  selectBrushColor,
  selectCanvasMode,
  selectZone,
  selectUserHighlight,
  selectPanels,
  selectCanvasActive,
  selectPopupOpen,
  selectBoards,
  selectName,
  selectRoomId,
  selectIsOwner,
  selectBoardCursor,
  selectTexts,
  selectVoting,
  selectNotesIndex,
} = boardFeature;

export const selectNote = (noteId: Note['id']) => {
  return createSelector(selectNotes, (notes: Note[]) =>
    notes.find((note) => note.id === noteId)
  );
};

export const isFocus = (id: string) => {
  return createSelector(selectFocusId, (focusId) => id === focusId);
};

export const selectUserById = (id: string) => {
  return createSelector(selectUsers, (users) => {
    return users.find((user) => user.id === id);
  });
};

export const selectCursors = () => {
  return createSelector(selectUsers, (users) => {
    return users.filter((user) => !!user.cursor).map((user) => user);
  });
};

export const selectBoardState = () => {
  return createSelector(boardFeature.selectBoardState, (state) => state);
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

export const usernameById = (userId: User['id']) => {
  return createSelector(selectUsers, (users) => {
    const user = users.find((user) => userId === user.id);

    return user?.name ?? '';
  });
};

export const selectNoteIndex = (noteId: Note['id']) => {
  return createSelector(selectNotesIndex, (notesIndex) => {
    return notesIndex[noteId] ?? 0;
  });
};
