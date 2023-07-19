import { z } from 'zod';

export const patchUserVisibility = z.object({
  visible: z.boolean(),
});
