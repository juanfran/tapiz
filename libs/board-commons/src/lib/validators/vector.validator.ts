import { z } from 'zod/v4';
import {
  CommonBoardValidation,
  SizeValidator,
} from './common-board-validation.js';

const vector = z.object({
  ...CommonBoardValidation,
  ...SizeValidator,
  url: z.string().max(1000),
  rotation: z.number(),
});

export const patchVector = vector.partial();

export const newVector = vector;
