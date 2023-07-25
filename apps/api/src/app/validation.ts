import {
  CommonState,
  NodeType,
  Note,
  StateActions,
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

export const validateAction = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  msg: StateActions,
  state: CommonState,
  userId: string
) => {
  if (msg.data.type === 'note') {
    if (msg.op === 'patch' || msg.op === 'remove') {
      const validatorResult = Validators.patchNote.safeParse(msg.data.node);

      if (!validatorResult.success) {
        return false;
      }

      const validNote = validatorResult.data as Note;

      const ownerProperties = ['text'];

      const node = state.notes.find((it) => it.id === validNote.id);

      const invalidAccess = Object.keys(validNote).some((it) =>
        ownerProperties.includes(it)
      );

      if (msg.op === 'patch' && invalidAccess && node?.ownerId !== userId) {
        return false;
      }

      return {
        ...msg,
        data: {
          type: msg.data.type,
          node: validNote,
        },
      };
    } else if (msg.op === 'add') {
      const validatorResult = Validators.newNote.safeParse(msg.data.node);

      if (!validatorResult.success) {
        return false;
      }

      return {
        ...msg,
        data: {
          type: msg.data.type,
          node: {
            ...validatorResult.data,
            ownerId: userId,
          },
        },
      };
    }
  } else {
    if (msg.op === 'patch' || msg.op === 'remove') {
      const stateType = msg.data.type as keyof CommonState;
      const validator = validations['patch'][msg.data.type as NodeType];

      if (validator) {
        const validatorResult = (validator as ZodAny).safeParse(msg.data.node);

        if (!validatorResult.success) {
          return false;
        }

        if (Array.isArray(state[stateType])) {
          const node = (state[stateType] as Array<{ id: string }>).find(
            (it) => it.id === validatorResult.data.id
          );

          if (!node) {
            return false;
          }
        }

        return {
          ...msg,
          data: {
            type: msg.data.type,
            node: validatorResult.data,
          },
        };
      }
    } else if (msg.op === 'add') {
      const validator = validations['new'][msg.data.type as NodeType];

      if (validator) {
        const validatorResult = (validator as ZodAny).safeParse(msg.data.node);

        if (!validatorResult.success) {
          return false;
        }

        return {
          ...msg,
          data: {
            type: msg.data.type,
            node: validatorResult.data,
          },
        };
      }
    }
  }

  return false;
};

export const validation = (
  msg: StateActions[],
  state: CommonState,
  userId: string
) => {
  if (Array.isArray(msg)) {
    msg = msg.filter((it) => Validators.stateAction.safeParse(it).success);

    const actions = msg.map((it) => {
      return validateAction(it, state, userId);
    });

    if (actions.every((it) => it)) {
      return actions as StateActions[];
    }
  }

  return [];
};
