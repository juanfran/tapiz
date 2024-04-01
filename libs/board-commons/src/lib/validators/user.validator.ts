import { z } from 'zod';
import { StateActions, TuNode } from '../models/node.model.js';

const user = z.object({
  visible: z.boolean(),
  cursor: z.object({
    x: z.number().safe(),
    y: z.number().safe(),
  }),
  zoom: z.number().safe(),
});

const patchUser = user.partial();

export const userValidator = (
  msg: StateActions,
  _state: TuNode[],
  userId: string,
): StateActions | false => {
  let validatorResult: unknown | null = null;

  if (msg.data.id !== userId) {
    return false;
  }

  if (msg.op === 'add') {
    const validation = user.safeParse(msg.data.content);

    if (validation.success) {
      validatorResult = validation.data;
    }
  } else if (msg.op === 'patch') {
    const validation = patchUser.safeParse(msg.data.content);

    if (!validation.success) {
      return false;
    }

    if (validation.success) {
      validatorResult = validation.data;
    }
  }
  if (msg.op === 'remove') {
    validatorResult = msg.data;
  }

  if (validatorResult) {
    return {
      op: msg.op,
      data: {
        id: msg.data.id,
        type: msg.data.type,
        content: validatorResult,
      },
    } as StateActions;
  }

  return false;
};
