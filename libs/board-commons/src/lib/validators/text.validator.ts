import { z } from 'zod';
import { CommonBoardValidation } from './common-board-validation.js';

const text = z.object({
  ...CommonBoardValidation,
  text: z.string().max(1000),
  width: z.number().nonnegative().safe(),
  height: z.number().nonnegative().safe(),
  rotation: z.number().safe(),
});

export const patchText = text.partial();

export const newText = text;
