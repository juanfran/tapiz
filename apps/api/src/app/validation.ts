import { StateActions, TuNode, Validators } from '@team-up/board-commons';

import { PERSONAL_TOKEN_VALIDATOR } from '@team-up/board-commons/validators/token.validator.js';
import { ESTIMATION_VALIDATORS } from '@team-up/board-commons/validators/estimation.validator.js';
import { SETTINGS_VALIDATOR } from '@team-up/board-commons/validators/settings.validators.js';

import { noteValidator } from '@team-up/board-commons/validators/note/node.validator.js';

import { type ZodAny } from 'zod';

const validations = {
  custom: {
    note: noteValidator,
    user: Validators.userValidator,
  },
  new: {
    panel: Validators.newPanel,
    group: Validators.newGroup,
    image: Validators.newImage,
    vector: Validators.newVector,
    text: Validators.newText,
  } as Record<string, unknown>,
  patch: {
    panel: Validators.patchPanel,
    group: Validators.patchGroup,
    image: Validators.patchImage,
    vector: Validators.patchVector,
    text: Validators.patchText,
  } as Record<string, unknown>,
  newValidators: [
    {
      type: 'token',
      validator: PERSONAL_TOKEN_VALIDATOR,
    },
    {
      type: 'settings',
      validator: SETTINGS_VALIDATOR,
    },
    ...ESTIMATION_VALIDATORS,
  ],
};

export const validateAction = (
  msg: StateActions,
  state: TuNode[],
  userId: string,
  isAdmin: boolean,
) => {
  const customValidators = msg.data.type in validations.custom;

  const validatorConfig = validations.newValidators.find(
    (it) => it.type === msg.data.type,
  );

  const findNode = (id: string, parentId?: string) => {
    if (parentId) {
      const parent = state.find((it) => it.id === parentId);

      if (!parent || !parent.children) {
        return;
      }

      return parent.children.find((it) => it.id === id);
    } else {
      return state.find((it) => it.id === id);
    }
  };

  if (validatorConfig) {
    if (msg.op === 'add') {
      const result = validatorConfig.validator.add(
        msg.data,
        userId,
        state,
        isAdmin,
      );

      if (result.success) {
        return {
          op: 'add',
          data: result.data,
          parent: msg.parent,
        };
      }
    } else if (msg.op === 'patch') {
      const node = findNode(msg.data.id, msg.parent);

      if (!node) {
        return false;
      }

      const result = validatorConfig.validator.patch(
        msg.data,
        userId,
        state,
        node,
        isAdmin,
      );

      if (result.success) {
        return {
          op: 'patch',
          data: result.data,
          parent: msg.parent,
        };
      }
    } else if (msg.op === 'remove') {
      const node = findNode(msg.data.id, msg.parent);

      if (!node) {
        return false;
      }

      const result = validatorConfig.validator.remove(
        msg.data,
        userId,
        state,
        node,
        isAdmin,
      );

      if (result.success) {
        return {
          op: 'remove',
          data: result.data,
          parent: msg.parent,
        };
      }
    }

    return false;
  }

  if (customValidators) {
    return validations.custom[msg.data.type as keyof typeof validations.custom](
      msg,
      state,
      userId,
    );
  } else {
    if (msg.op === 'patch' || msg.op === 'remove') {
      const validator = validations['patch'][msg.data.type];

      // check if the element present in the state
      const node = state.find((it) => it.id === msg.data.id);

      if (!node) {
        return false;
      }

      if (msg.op === 'remove') {
        return {
          op: msg.op,
          data: {
            id: msg.data.id,
            type: msg.data.type,
          },
        };
      } else if (msg.op === 'patch') {
        if (validator) {
          const validatorResult = (validator as ZodAny).safeParse(
            msg.data.content,
          );

          if (!validatorResult.success) {
            return false;
          }

          return {
            op: msg.op,
            data: {
              id: msg.data.id,
              type: msg.data.type,
              content: validatorResult.data,
            },
          };
        }
      }
    } else if (msg.op === 'add') {
      const validator = validations['new'][msg.data.type];

      if (validator) {
        const validatorResult = (validator as ZodAny).safeParse(
          msg.data.content,
        );

        if (!validatorResult.success) {
          return false;
        }

        return {
          op: msg.op,
          data: {
            id: msg.data.id,
            type: msg.data.type,
            content: validatorResult.data,
          },
        };
      }
    }
  }

  return false;
};

export const validation = (
  msg: StateActions[],
  state: TuNode[],
  userId: string,
  isAdmin: boolean,
) => {
  if (Array.isArray(msg)) {
    msg = msg.filter((it) => Validators.stateAction.safeParse(it).success);

    const actions = msg.map((it) => {
      return validateAction(it, state, userId, isAdmin);
    });

    if (actions.every((it) => it)) {
      return actions as StateActions[];
    }
  }

  return [];
};
