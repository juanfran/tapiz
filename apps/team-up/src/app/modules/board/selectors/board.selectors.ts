import { createSelector } from '@ngrx/store';
import { NodeType, Note, User } from '@team-up/board-commons';
import { boardFeature } from '../reducers/board.reducer';
import { selectFocusId } from './page.selectors';

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
    return users
      .filter((user) => !!user.cursor && user.connected)
      .map((user) => user);
  });
};

export const usernameById = (userId: User['id']) => {
  return createSelector(selectUsers, (users) => {
    const user = users.find((user) => userId === user.id);

    return user?.name ?? '';
  });
};

export const selectAllNodes = () => {
  return createSelector(
    selectNotes,
    selectImages,
    selectGroups,
    selectPanels,
    selectTexts,
    selectVectors,
    (note, image, group, panel, text, vector) => {
      return {
        note,
        image,
        group,
        panel,
        text,
        vector,
      } as unknown as Record<NodeType, { id: string; ownerId?: string }[]>;
    }
  );
};

export const selectNoteFocus = createSelector(
  selectNotes,
  selectFocusId,
  (notes: Note[], noteId) => notes.find((note) => noteId.includes(note.id))
);
