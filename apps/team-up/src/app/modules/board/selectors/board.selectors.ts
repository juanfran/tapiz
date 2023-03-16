import { createSelector } from '@ngrx/store';
import { Note, User } from '@team-up/board-commons';
import { boardFeature } from '../reducers/board.reducer';

export const {
  selectNotes,
  selectImages,
  selectUsers,
  selectGroups,
  selectPanels,
  selectName,
  selectTexts,
  selectBoardState,
  selectVectors,
} = boardFeature;

export const selectNote = (noteId: Note['id']) => {
  return createSelector(selectNotes, (notes: Note[]) =>
    notes.find((note) => note.id === noteId)
  );
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

export const usernameById = (userId: User['id']) => {
  return createSelector(selectUsers, (users) => {
    const user = users.find((user) => userId === user.id);

    return user?.name ?? '';
  });
};
