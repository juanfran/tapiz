import { z } from 'zod';
import {
  CommonBoardValidation,
  SizeValidator,
} from './common-board-validation.js';

const panel = z.object({
  ...CommonBoardValidation,
  ...SizeValidator,
  text: z.string().max(1000),
  backgroundColor: z.string().length(7).regex(/^#/).nullable(),
  borderColor: z.string().length(7).regex(/^#/).nullable(),
  borderWidth: z.number().nonnegative().safe().nullable(),
  borderRadius: z.number().nonnegative().safe().nullable(),
  color: z.string().length(7).regex(/^#/).nullable(),
  rotation: z.number().safe(),
  textAlign: z.enum(['start', 'center', 'end']).nullable(),
  drawing: z.array(
    z.object({
      color: z.string().min(4).max(7),
      size: z.number().positive().safe(),
      x: z.number().safe(),
      y: z.number().safe(),
      nX: z.number().safe(),
      nY: z.number().safe(),
    }),
  ),
});

export const patchPanel = panel.partial();

export const newPanel = panel.partial().required({
  position: true,
  width: true,
  height: true,
});
