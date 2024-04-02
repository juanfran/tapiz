import { z } from 'zod';

export const stateAction = z.object({
  op: z.enum(['add', 'remove', 'patch']),
  data: z.object({
    content: z.any(),
    type: z.string().max(255),
  }),
  parent: z.string().optional(),
  position: z.number().optional(),
});
