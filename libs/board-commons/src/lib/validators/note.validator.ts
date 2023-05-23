import { z } from 'zod';

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
