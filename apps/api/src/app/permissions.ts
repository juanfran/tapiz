import {
  BoardCommonActions,
  CommonState,
  NodeAction,
  Note,
  User,
} from '@team-up/board-commons';

export function checkPermissionsAction(
  state: CommonState,
  action: NodeAction,
  userId: User['id']
) {
  if (
    (action.type === BoardCommonActions.patchNode ||
      action.type === BoardCommonActions.removeNode) &&
    action.nodeType === 'note'
  ) {
    const actionNode = action.node as Note;
    const note = state.notes.find((note) => note.id === actionNode.id);

    return note?.ownerId === userId;
  }

  return true;
}
