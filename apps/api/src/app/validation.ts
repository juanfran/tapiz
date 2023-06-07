import {
  BoardCommonActions,
  CommonState,
  NodeAction,
  NodeState,
  NodeType,
  Note,
  Validators,
} from '@team-up/board-commons';
import { ZodAny } from 'zod';

const validations = {
  new: {
    panel: Validators.newPanel,
    group: Validators.newGroup,
    image: Validators.newImage,
    vector: Validators.newVector,
    text: Validators.newText,
  } as Record<NodeType, unknown>,
  patch: {
    panel: Validators.patchPanel,
    group: Validators.patchGroup,
    image: Validators.patchImage,
    vector: Validators.patchVector,
    text: Validators.patchText,
  } as Record<NodeType, unknown>,
};

export const validation = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  msg: any | NodeAction,
  state: CommonState,
  userId: string
) => {
  if (msg.type === BoardCommonActions.moveCursor) {
    const validatorResult = Validators.cursor.safeParse(msg.cursor);

    if (!validatorResult.success) {
      return false;
    }

    return msg;
  } else if (msg.type === BoardCommonActions.setVisible) {
    return msg;
  } else {
    const action = msg as NodeAction;

    if (action.nodeType === 'note') {
      if (
        action.type === BoardCommonActions.patchNode ||
        action.type === BoardCommonActions.removeNode
      ) {
        const validatorResult = Validators.patchNote.safeParse(action.node);

        if (!validatorResult.success) {
          return false;
        }

        const validNote = validatorResult.data as Note;

        const ownerProperties = ['text'];

        const node = state.notes.find((it) => it.id === validNote.id);

        const invalidAccess = Object.keys(validNote).some((it) =>
          ownerProperties.includes(it)
        );

        if (
          action.type === BoardCommonActions.patchNode &&
          invalidAccess &&
          node?.ownerId !== userId
        ) {
          return false;
        }

        return {
          ...action,
          node: validNote,
        };
      } else if (action.type === BoardCommonActions.addNode) {
        const validatorResult = Validators.newNote.safeParse(action.node);

        if (!validatorResult.success) {
          return false;
        }

        return {
          ...action,
          node: {
            ...validatorResult.data,
            ownerId: userId,
          },
        };
      }
    } else {
      if (
        action.type === BoardCommonActions.patchNode ||
        action.type === BoardCommonActions.removeNode
      ) {
        const validator = validations['patch'][action.nodeType];

        if (validator) {
          const validatorResult = (validator as ZodAny).safeParse(action.node);

          if (!validatorResult.success) {
            return false;
          }

          const stateType = NodeState[action.nodeType] as keyof CommonState;

          if (Array.isArray(state[stateType])) {
            const node = (state[stateType] as Array<{ id: string }>).find(
              (it) => it.id === validatorResult.data.id
            );

            if (!node) {
              return false;
            }
          }

          return {
            ...action,
            node: validatorResult.data,
          };
        }
      } else if (action.type === BoardCommonActions.addNode) {
        const validator = validations['new'][action.nodeType];

        if (validator) {
          const validatorResult = (validator as ZodAny).safeParse(action.node);

          if (!validatorResult.success) {
            return false;
          }

          return {
            ...action,
            node: {
              ...validatorResult.data,
              ownerId: userId,
            },
          };
        }
      }
    }
  }

  return false;
};
