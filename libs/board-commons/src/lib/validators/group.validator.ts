import { z } from 'zod/v4';
import {
  CommonBoardValidation,
  SizeValidator,
} from './common-board-validation.js';

const group = z.object({
  ...CommonBoardValidation,
  ...SizeValidator,
  title: z.string().max(1000),
  votes: z.array(
    z.object({
      userId: z.string().max(255),
      vote: z.number().int().min(0),
    }),
  ),
  unLocked: z.boolean().optional(),
});

export const patchGroup = group.partial();

export const newGroup = group.partial().required({
  position: true,
  width: true,
  height: true,
});
