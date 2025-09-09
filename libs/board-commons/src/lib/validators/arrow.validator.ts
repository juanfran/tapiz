import { z } from 'zod/v4';
import {
  CommonBoardValidation,
  SizeValidator,
} from './common-board-validation.js';

const arrow = z.object({
  x: z.number(),
  y: z.number(),
  rotation: z.number(),
  color: z.string().max(50),
  thickness: z.number().min(1).max(20),
  headSize: z.number().min(1).max(50),
});

export const patchArrow = arrow.partial();

export const newArrow = arrow;
