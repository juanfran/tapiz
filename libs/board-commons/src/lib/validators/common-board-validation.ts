import { z } from 'zod';

export const CommonBoardValidation = {
  position: z.object({
    x: z.number().safe(),
    y: z.number().safe(),
  }),
  layer: z.number().safe(),
};
