import { z } from 'zod';
import { CommonBoardValidation } from './common-board-validation';

const image = z.object({
  ...CommonBoardValidation,
  width: z.number().nonnegative().safe(),
  height: z.number().nonnegative().safe(),
  url: z.string().max(1000),
  rotation: z.number().safe(),
});

export const patchImage = image.partial();

export const newImage = image;
