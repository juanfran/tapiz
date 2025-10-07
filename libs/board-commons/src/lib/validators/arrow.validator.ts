import { z } from 'zod/v4';
import {
  CommonBoardValidation,
  SizeValidator,
} from './common-board-validation.js';

const arrow = z.object({
  layer: CommonBoardValidation.layer,
  position: CommonBoardValidation.position,
  start: z.object({
    x: z.number(),
    y: z.number(),
  }),
  end: z.object({
    x: z.number(),
    y: z.number(),
  }),
  color: z.string().length(7).regex(/^#/).nullable().optional(),
  strokeStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
  arrowType: z.enum(['sharp', 'curved', 'elbow']).optional(),
});

export const patchArrow = arrow.partial();

export const newArrow = arrow;

export type Arrow = z.infer<typeof newArrow>;
