import { z } from 'zod';
import { CommonBoardValidation } from './common-board-validation';

const panel = z.object({
  ...CommonBoardValidation,
  title: z.string().max(1000),
  width: z.number().nonnegative().safe(),
  height: z.number().nonnegative().safe(),
  color: z.string().length(7).regex(/^#/).nullable(),
  backgroundColor: z.string().length(7).regex(/^#/).nullable(),
  fontColor: z.string().length(7).regex(/^#/).nullable(),
  fontSize: z.number().nonnegative().safe().nullable(),
  borderColor: z.string().length(7).regex(/^#/).nullable(),
  borderWidth: z.number().nonnegative().safe().nullable(),
  borderRadius: z.number().nonnegative().safe().nullable(),
});

export const patchPanel = panel.partial();

export const newPanel = panel.partial().required({
  position: true,
  width: true,
  height: true,
});
