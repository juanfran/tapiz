import { z } from 'zod';
import {
  CommonBoardValidation,
  SizeValidator,
} from './common-board-validation.js';

const panel = z.object({
  ...CommonBoardValidation,
  ...SizeValidator,
  text: z.string(),
  backgroundColor: z.string().length(7).regex(/^#/).nullable(),
  borderColor: z.string().length(7).regex(/^#/).nullable(),
  borderWidth: z.number().nonnegative().safe().nullable(),
  borderRadius: z.number().nonnegative().safe().nullable(),
  color: z.string().length(7).regex(/^#/).nullable(),
  rotation: z.number().safe(),
  textAlign: z.enum(['start', 'center', 'end']).nullable(),
  drawing: z.array(
    z.object({
      color: z.string(),
      size: z.number().positive().safe(),
      points: z.array(
        z.object({
          x: z.number().safe(),
          y: z.number().safe(),
        }),
      ),
    }),
  ),
});

export const patchPanel = panel.partial();

export const newPanel = panel.partial().required({
  position: true,
  width: true,
  height: true,
});
