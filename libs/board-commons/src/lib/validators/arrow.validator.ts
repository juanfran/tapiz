import { z } from 'zod/v4';
import {
  CommonBoardValidation,
  SizeValidator,
} from './common-board-validation.js';

export const arrowAttachment = z.object({
  nodeId: z.string().min(1),
  offset: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export const arrowHead = z.enum(['start', 'end']);

const arrow = z.object({
  layer: CommonBoardValidation.layer,
  position: CommonBoardValidation.position,
  ...SizeValidator,
  start: z.object({
    x: z.number(),
    y: z.number(),
  }),
  end: z.object({
    x: z.number(),
    y: z.number(),
  }),
  color: z.string().length(7).regex(/^#/).nullable().optional(),
  strokeStyle: z.enum(['solid', 'dashed', 'dotted']),
  arrowType: z.enum(['sharp', 'curved', 'elbow']),
  heads: z.array(arrowHead).optional(),
  startAttachment: arrowAttachment.optional(),
  endAttachment: arrowAttachment.optional(),
});

export const patchArrow = arrow.partial();

export const newArrow = arrow;

export type Arrow = z.infer<typeof newArrow>;
