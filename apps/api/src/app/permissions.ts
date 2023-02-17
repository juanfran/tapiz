import { BoardCommonActions, CommonState, User } from '@team-up/board-commons';

export function checkPermissionsAction(
  state: CommonState,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: any,
  userId: User['id']
) {
  if (
    action.type === BoardCommonActions.patchNode &&
    action.nodeType === 'note' &&
    action.node.text
  ) {
    const note = state.notes.find((note) => note.id === action.node.id);

    return note?.ownerId === userId;
  }

  return true;
}
