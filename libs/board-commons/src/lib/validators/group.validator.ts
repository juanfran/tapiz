import { z } from 'zod';
import { CommonBoardValidation } from './common-board-validation';

const group = z.object({
  ...CommonBoardValidation,
  title: z.string().max(1000),
  votes: z.array(
    z.object({
      userId: z.string().max(255),
      vote: z.number().int().min(0),
    }),
  ),
  width: z.number().nonnegative().safe(),
  height: z.number().nonnegative().safe(),
});

export const patchGroup = group.partial();

export const newGroup = group.partial().required({
  position: true,
  width: true,
  height: true,
});
