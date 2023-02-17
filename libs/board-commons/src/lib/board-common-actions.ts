const ActionType = '[Board]';

export const BoardCommonActions = {
  setBoardName: `${ActionType} SetBoardName`,
  moveCursor: `${ActionType} MoveCursor`,
  patchNode: `${ActionType} PatchNode`,
  addNode: `${ActionType} AddNode`,
  removeNode: `${ActionType} RemoveNode`,
  setVisible: `${ActionType} Set visible`,
  wsSetState: `${ActionType} Ws set state`,
};
