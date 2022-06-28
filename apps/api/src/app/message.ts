import { BoardActions, Diff, CommonState } from '@team-up/board-commons';
import { Point } from 'fabric/fabric-impl';

const nodeTypeState = {
  note: 'notes',
  group: 'groups',
  panel: 'panels',
  image: 'images',
  text: 'texts',
};

function onMessage(
  type: string,
  fn: (message: unknown, clientId: string, state: CommonState) => Diff
) {
  return {
    type,
    fn,
  };
}

export const messageManager = [
  onMessage(BoardActions.patchNode, (message: Record<string, string>) => {
    return {
      edit: {
        [message.nodeType]: [message.node],
      },
    };
  }),
  onMessage(BoardActions.addNode, (message: Record<string, string>) => {
    return {
      add: {
        [nodeTypeState[message.nodeType]]: [message.node],
      },
    };
  }),
  onMessage(BoardActions.removeNode, (message: { nodeType: string; node: Record<string, string> }) => {
    return {
      remove: {
        [nodeTypeState[message.nodeType]]: [message.node.id],
      },
    };
  }),
  onMessage(BoardActions.moveCursor, (message: { cursor: Point }, userId) => {
    return {
      edit: {
        users: [
          {
            id: userId,
            cursor: message.cursor,
          },
        ],
      },
    };
  }),
  onMessage(
    BoardActions.setVisible,
    (message: { visible: boolean }, userId) => {
      return {
        edit: {
          users: [
            {
              id: userId,
              visible: message.visible,
            },
          ],
        },
      };
    }
  ),
];
