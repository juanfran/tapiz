import { z } from 'zod/v4';

export const changeBoardName = z.object({
  type: z.string(),
  name: z.string().max(255),
});
