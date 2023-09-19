import { z } from 'zod';

const text = z.object({
  text: z.string().max(1000),
  position: z.object({
    x: z.number().safe(),
    y: z.number().safe(),
  }),
  width: z.number().nonnegative().safe(),
  height: z.number().nonnegative().safe(),
  color: z.string().min(4).max(7),
  size: z.number().positive().safe(),
});

export const patchText = text.partial();

export const newText = text;
