import { z } from 'zod';

import { type CommonState } from '../../models/common-state.model';
import { type StateActions } from '../../models/node.model';

const note = z.object({
  text: z.string().max(140),
  votes: z.number().int().nonnegative().safe(),
  position: z.object({
    x: z.number().safe(),
    y: z.number().safe(),
  }),
  emojis: z.array(
    z.object({
      unicode: z.string().max(255),
      position: z.object({
        x: z.number().safe(),
        y: z.number().safe(),
      }),
    })
  ),
  drawing: z.array(
    z.object({
      color: z.string().min(4).max(7),
      size: z.number().positive().safe(),
      x: z.number().safe(),
      y: z.number().safe(),
      nX: z.number().safe(),
      nY: z.number().safe(),
    })
  ),
});

export const patchNote = note.partial().extend({
  id: z.string().max(255),
});

export const newNote = note.extend({
  id: z.string().max(255),
});

export const validate = (
  msg: StateActions,
  state: CommonState,
  userId: string
): StateActions | false => {
  let validatorResult: StateActions['data']['node'] | null = null;

  if (msg.op === 'add') {
    const validation = newNote.safeParse(msg.data.node);

    if (validation.success) {
      validatorResult = {
        ...validation.data,
        ownerId: userId,
      };
    }
  } else if (msg.op === 'patch' || msg.op === 'remove') {
    const validation = patchNote.safeParse(msg.data.node);

    if (!validation.success) {
      return false;
    }

    const ownerProperties = ['text'];

    const validNote = validation.data;

    const node = state.notes.find((it) => it.id === validNote.id);

    const invalidAccess = Object.keys(validNote).some((it) =>
      ownerProperties.includes(it)
    );

    if (msg.op === 'patch' && invalidAccess && node?.ownerId !== userId) {
      return false;
    }

    if (validation.success) {
      validatorResult = validation.data;
    }
  }

  if (validatorResult) {
    return {
      op: msg.op,
      data: {
        type: msg.data.type,
        node: validatorResult,
      },
    } as StateActions;
  }

  return false;
};
