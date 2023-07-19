import { z } from 'zod';

export const stateAction = z.object({
  op: z.enum(['add', 'remove', 'patch']),
  data: z.object({
    node: z.any(),
    type: z.enum(['note', 'group', 'panel', 'image', 'text', 'vector']),
  }),
});
