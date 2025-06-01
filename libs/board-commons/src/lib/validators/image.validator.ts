import { z } from 'zod/v4';
import {
  CommonBoardValidation,
  SizeValidator,
} from './common-board-validation.js';

const image = z.object({
  ...CommonBoardValidation,
  ...SizeValidator,
  url: z.string().max(2000),
  rotation: z.number(),
});

export const patchImage = image.partial();

export const newImage = image;
