import { z } from 'zod';
import { CommonBoardValidation } from './common-board-validation';

const vector = z.object({
  ...CommonBoardValidation,
  width: z.number().nonnegative().safe(),
  height: z.number().nonnegative().safe(),
  url: z.string().max(1000),
  rotation: z.number().safe(),
});

export const patchVector = vector.partial();

export const newVector = vector;
