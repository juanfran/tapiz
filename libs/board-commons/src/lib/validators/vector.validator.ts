import { z } from 'zod';

const vector = z.object({
  position: z.object({
    x: z.number().safe(),
    y: z.number().safe(),
  }),
  width: z.number().nonnegative().safe(),
  height: z.number().nonnegative().safe(),
  url: z.string().max(1000),
});

export const patchVector = vector.partial().extend({
  id: z.string().max(255),
});

export const newVector = vector.extend({
  id: z.string().max(255),
});
