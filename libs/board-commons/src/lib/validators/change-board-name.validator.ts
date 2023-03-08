import { z } from 'zod';

export const changeBoardName = z.object({
  type: z.string(),
  name: z.string().max(255),
});
