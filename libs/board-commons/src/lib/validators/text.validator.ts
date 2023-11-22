import { z } from 'zod';
import { CommonBoardValidation } from './common-board-validation';

const text = z.object({
  ...CommonBoardValidation,
  text: z.string().max(1000),
  width: z.number().nonnegative().safe(),
  height: z.number().nonnegative().safe(),
  color: z.string().min(4).max(7),
  size: z.number().positive().safe(),
});

export const patchText = text.partial();

export const newText = text;
