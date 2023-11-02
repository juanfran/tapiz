import { z } from 'zod';

import { type StateActions } from '../../models/node.model';

const note = z.object({
  text: z.string().max(140),
  votes: z.array(
    z.object({
      userId: z.string().max(255),
      vote: z.number().int().min(0),
    }),
  ),
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
    }),
  ),
  drawing: z.array(
    z.object({
      color: z.string().min(4).max(7),
      size: z.number().positive().safe(),
      x: z.number().safe(),
      y: z.number().safe(),
      nX: z.number().safe(),
      nY: z.number().safe(),
    }),
  ),
  ownerId: z.string().max(255),
});

export const patchNote = note.partial();

export const newNote = note;

export const validate = (msg: StateActions): StateActions | false => {
  let validatorResult: unknown | null = null;

  if (msg.op === 'add') {
    const validation = newNote.safeParse(msg.data.content);

    if (validation.success) {
      validatorResult = validation.data;
    }
  } else if (msg.op === 'patch') {
    const validation = patchNote.safeParse(msg.data.content);

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
