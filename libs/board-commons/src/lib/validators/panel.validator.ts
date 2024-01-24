import { z } from 'zod';
import { CommonBoardValidation } from './common-board-validation.js';

const panel = z.object({
  ...CommonBoardValidation,
  text: z.string().max(1000),
  width: z.number().nonnegative().safe(),
  height: z.number().nonnegative().safe(),
  backgroundColor: z.string().length(7).regex(/^#/).nullable(),
  borderColor: z.string().length(7).regex(/^#/).nullable(),
  borderWidth: z.number().nonnegative().safe().nullable(),
  borderRadius: z.number().nonnegative().safe().nullable(),
  color: z.string().length(7).regex(/^#/).nullable(),
  rotation: z.number().safe(),
  textAlign: z.enum(['start', 'center', 'end']).nullable(),
});

export const patchPanel = panel.partial();

export const newPanel = panel.partial().required({
  position: true,
  width: true,
  height: true,
});
