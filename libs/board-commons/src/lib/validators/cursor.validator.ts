import { z } from 'zod';

export const cursor = z.object({
  x: z.number().safe(),
  y: z.number().safe(),
});
