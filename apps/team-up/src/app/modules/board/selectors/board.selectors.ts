import { createSelector } from '@ngrx/store';
import { User, isNote } from '@team-up/board-commons';
import { boardFeature } from '../reducers/board.reducer';
import { selectFocusId } from './page.selectors';

export const { selectUsers, selectName, selectBoardState } = boardFeature;

export const selectNote = (noteId: string) => {
  return createSelector(boardFeature.selectNodes, (nodes) => {
    return nodes.filter(isNote).find((note) => note.id === noteId);
  });
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

export const selectNoteFocus = createSelector(
  boardFeature.selectNodes,
  selectFocusId,
  (nodes, noteId) => {
    return nodes.filter(isNote).find((note) => noteId.includes(note.id));
  }
);
