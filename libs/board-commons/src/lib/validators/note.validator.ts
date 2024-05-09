import { z } from 'zod';

import type { NodeValidator } from '../models/node.model.js';
import {
  CommonBoardValidation,
  SizeValidator,
} from './common-board-validation.js';

const note = z.object({
  ...CommonBoardValidation,
  ...SizeValidator,
  text: z.string(),
  votes: z.array(
    z.object({
      userId: z.string().max(255),
      vote: z.number().int().min(0),
    }),
  ),
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
      color: z.string(),
      size: z.number().positive().safe(),
      points: z.array(
        z.object({
          x: z.number().safe(),
          y: z.number().safe(),
        }),
      ),
    }),
  ),
  ownerId: z.string().max(255),
  width: z.number().positive(),
  height: z.number().positive(),
  color: z.string().length(7).regex(/^#/).nullable().optional(),
});

export const patchNote = note.partial();

export const newNote = note;

const NOTE_VALIDATOR: NodeValidator = {
  add: async (data) => {
    const validation = newNote.safeParse(data.content);

    if (validation.success) {
      return {
        success: true,
        data: {
          ...data,
          content: {
            ...validation.data,
          },
        },
      };
    }

    return {
      success: false,
    };
  },
  patch: async (data) => {
    const validation = patchNote.safeParse(data.content);

    if (validation.success) {
      return {
        success: true,
        data: {
          ...data,
          content: {
            ...validation.data,
          },
        },
      };
    }

    return {
      success: false,
    };
  },
  remove: async (data) => {
    return {
      success: true,
      data,
    };
  },
};

export const NOTE_VALIDATORS = [
  {
    type: 'note',
    validator: NOTE_VALIDATOR,
  },
] as const;
