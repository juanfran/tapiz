import { z } from 'zod';
import {
  CommonBoardValidation,
  SizeValidator,
} from './common-board-validation.js';

const text = z.object({
  ...CommonBoardValidation,
  ...SizeValidator,
  text: z.string().max(1000),
  rotation: z.number().safe(),
});

export const patchText = text.partial();

export const newText = text;
