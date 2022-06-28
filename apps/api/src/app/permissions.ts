import { BoardActions, CommonState, User } from '@team-up/board-commons';

export function checkPermissionsAction(
  state: CommonState,
  action: any,
  userId: User['id']
) {
  if (
    action.type === BoardActions.patchNode &&
    action.nodeType === 'notes' &&
    action.node.text
  ) {
    const note = state.notes.find((note) => note.id === action.node.id);

    if (note.ownerId !== userId) {
      return false;
    }
  }

  return true;
}
