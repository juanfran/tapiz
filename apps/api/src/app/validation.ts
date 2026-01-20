import { StateActions, TuNode } from '@tapiz/board-commons';
import { Validators } from '@tapiz/board-commons/validators/index.js';

import { PERSONAL_TOKEN_VALIDATOR } from '@tapiz/board-commons/validators/token.validator.js';
import { ESTIMATION_VALIDATORS } from '@tapiz/board-commons/validators/estimation.validator.js';
import { POLL_VALIDATORS } from '@tapiz/board-commons/validators/poll.validator.js';
import { COMMENTS_VALIDATORS } from '@tapiz/board-commons/validators/comments.validator.js';
import { SETTINGS_VALIDATOR } from '@tapiz/board-commons/validators/settings.validators.js';
import { TIMER_VALIDATORS } from '@tapiz/board-commons/validators/timer.validators.js';

import { NOTE_VALIDATORS } from '@tapiz/board-commons/validators/note.validator.js';

const validations = {
  custom: {
    user: Validators.userValidator,
  },
  new: {
    panel: Validators.newPanel,
    group: Validators.newGroup,
    image: Validators.newImage,
    vector: Validators.newVector,
    text: Validators.newText,
  },
  patch: {
    panel: Validators.patchPanel,
    group: Validators.patchGroup,
    image: Validators.patchImage,
    vector: Validators.patchVector,
    text: Validators.patchText,
  },
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
    ...POLL_VALIDATORS,
    ...COMMENTS_VALIDATORS,
    ...NOTE_VALIDATORS,
    ...TIMER_VALIDATORS,
  ],
};

export const validateAction = async (
  msg: StateActions,
  nodes: TuNode[],
  userId: string,
  isAdmin: boolean,
  boardId: string,
  userPrivateId: string,
): Promise<StateActions | false> => {
  const customValidators = msg.data.type in validations.custom;

  const validatorConfig = validations.newValidators.find(
    (it) => it.type === msg.data.type,
  );

  const findNode = (id: string, parentId?: string) => {
    if (parentId) {
      const parent = nodes.find((it) => it.id === parentId);

      if (!parent || !parent.children) {
        return;
      }

      return parent.children.find((it) => it.id === id);
    } else {
      return nodes.find((it) => it.id === id);
    }
  };

  let parentNode: TuNode | undefined;

  if (msg.parent) {
    parentNode = nodes.find((it) => it.id === msg.parent);
  }

  if (validatorConfig) {
    if (msg.op === 'add') {
      const result = await validatorConfig.validator.add(msg.data, {
        userId,
        nodes: nodes,
        isAdmin,
        boardId,
        userPrivateId,
        parentNode,
      });

      if (result.success) {
        return {
          op: 'add',
          data: result.data,
          parent: msg.parent,
          position: msg.position,
        };
      }

      if (result.error) {
        console.error('[Node Validation Failed]', {
          nodeType: msg.data.type,
          operation: 'add',
          nodeId: msg.data.id,
          userId,
          errors: result.error.issues,
        });
      }
    } else if (msg.op === 'patch') {
      const node = findNode(msg.data.id, msg.parent);

      if (!node) {
        return false;
      }

      const result = await validatorConfig.validator.patch(msg.data, {
        userId,
        nodes,
        node,
        isAdmin,
        boardId,
        userPrivateId,
        parentNode,
      });

      if (result.success) {
        return {
          op: 'patch',
          data: result.data,
          parent: msg.parent,
          position: msg.position,
        };
      }

      if (result.error) {
        console.error('[Node Validation Failed]', {
          nodeType: msg.data.type,
          operation: 'patch',
          nodeId: msg.data.id,
          userId,
          errors: result.error.issues,
        });
      }
    } else if (msg.op === 'remove') {
      const node = findNode(msg.data.id, msg.parent);

      if (!node) {
        return false;
      }

      const result = await validatorConfig.validator.remove(msg.data, {
        userId,
        nodes,
        node,
        isAdmin,
        boardId,
        userPrivateId,
        parentNode,
      });

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
      nodes,
      userId,
    );
  } else {
    if (msg.op === 'patch' || msg.op === 'remove') {
      const validator =
        validations['patch'][msg.data.type as keyof typeof validations.patch];

      // check if the element present in the state
      const node = nodes.find((it) => it.id === msg.data.id);

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
          const validatorResult = validator.safeParse(msg.data.content);

          if (!validatorResult.success) {
            console.error('[Node Validation Failed]', {
              nodeType: msg.data.type,
              operation: 'patch',
              nodeId: msg.data.id,
              userId,
              errors: validatorResult.error.issues.map((err) => ({
                path: err.path.join('.'),
                message: err.message,
                code: err.code,
              })),
            });
            return false;
          }

          return {
            op: msg.op,
            data: {
              id: msg.data.id,
              type: msg.data.type,
              content: validatorResult.data,
            },
            parent: msg.parent,
            position: msg.position,
          };
        }
      }
    } else if (msg.op === 'add') {
      const validator =
        validations['new'][msg.data.type as keyof typeof validations.new];

      if (validator) {
        const validatorResult = validator.safeParse(msg.data.content);

        if (!validatorResult.success) {
          console.error('[Node Validation Failed]', {
            nodeType: msg.data.type,
            operation: 'add',
            nodeId: msg.data.id,
            userId,
            errors: validatorResult.error.issues.map((err) => ({
              path: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          });
          return false;
        }

        return {
          op: msg.op,
          data: {
            id: msg.data.id,
            type: msg.data.type,
            content: validatorResult.data,
          },
          parent: msg.parent,
          position: msg.position,
        };
      }
    }
  }

  return false;
};

export const validation = async (
  msg: StateActions[],
  state: TuNode[],
  userId: string,
  isAdmin: boolean,
  boardId: string,
  privateId: string,
) => {
  if (Array.isArray(msg)) {
    msg = msg.filter((it) => {
      const result = Validators.stateAction.safeParse(it);
      if (!result.success) {
        console.error('[Node Validation Failed]', {
          nodeType: it?.data?.type || 'unknown',
          operation: it?.op || 'unknown',
          nodeId: it?.data?.id,
          userId,
          errors: result.error.issues.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
      }
      return result.success;
    });

    const actions = await Promise.all(
      msg.map((it) => {
        return validateAction(it, state, userId, isAdmin, boardId, privateId);
      }),
    );

    if (actions.every((it): it is StateActions => !!it)) {
      return actions;
    }
  }

  return [];
};
