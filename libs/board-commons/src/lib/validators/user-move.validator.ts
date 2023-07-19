import { z } from 'zod';

export const userMove = z.object({
  cursor: z.object({
    x: z.number().safe(),
    y: z.number().safe(),
  }),
  position: z.object({
    x: z.number().safe(),
    y: z.number().safe(),
  }),
});
