import { z } from 'zod';

const image = z.object({
  position: z.object({
    x: z.number().safe(),
    y: z.number().safe(),
  }),
  width: z.number().nonnegative().safe(),
  height: z.number().nonnegative().safe(),
  url: z.string().max(1000),
  rotation: z.number().safe(),
});

export const patchImage = image.partial().extend({
  id: z.string().max(255),
});

export const newImage = image.extend({
  id: z.string().max(255),
});
