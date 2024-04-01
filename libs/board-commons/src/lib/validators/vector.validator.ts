import { z } from 'zod';
import {
  CommonBoardValidation,
  SizeValidator,
} from './common-board-validation.js';

const vector = z.object({
  ...CommonBoardValidation,
  ...SizeValidator,
  url: z.string().max(1000),
  rotation: z.number().safe(),
});

export const patchVector = vector.partial();

export const newVector = vector;
