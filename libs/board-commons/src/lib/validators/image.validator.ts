import { z } from 'zod/v4';
import {
  CommonBoardValidation,
  SizeValidator,
} from './common-board-validation.js';

const image = z.object({
  ...CommonBoardValidation,
  ...SizeValidator,
  url: z
    .string()
    .max(2000)
    .refine((val) => /^https?:\/\//i.test(val), {
      message: 'URL must use http or https protocol',
    }),
  rotation: z.number(),
});

export const patchImage = image.partial();

export const newImage = image;
