import { z } from 'zod/v4';
import {
  CommonBoardValidation,
  SizeValidator,
} from './common-board-validation.js';
import { colorSchema, nullableColorSchema } from './color.validator.js';

const panel = z.object({
  ...CommonBoardValidation,
  ...SizeValidator,
  text: z.string(),
  backgroundColor: nullableColorSchema,
  borderColor: nullableColorSchema,
  borderWidth: z.number().nonnegative().int().nullable(),
  borderRadius: z.number().nonnegative().int().nullable(),
  color: nullableColorSchema,
  rotation: z.number(),
  drawing: z.array(
    z.object({
      color: colorSchema,
      size: z.number().positive().int(),
      points: z.array(
        z.object({
          x: z.number(),
          y: z.number(),
        }),
      ),
    }),
  ),
  unLocked: z.boolean().optional(),
});

export const patchPanel = panel.partial();

export const newPanel = panel.partial().required({
  position: true,
  width: true,
  height: true,
});
