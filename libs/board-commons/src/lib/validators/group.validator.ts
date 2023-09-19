import { z } from 'zod';

const group = z.object({
  title: z.string().max(1000),
  position: z.object({
    x: z.number().safe(),
    y: z.number().safe(),
  }),
  votes: z.array(
    z.object({
      userId: z.string().max(255),
      vote: z.number().int().min(0),
    })
  ),
  width: z.number().nonnegative().safe(),
  height: z.number().nonnegative().safe(),
});

export const patchGroup = group.partial().extend({
  id: z.string().max(255),
});

export const newGroup = group
  .partial()
  .extend({
    id: z.string().max(255),
  })
  .required({
    position: true,
    width: true,
    height: true,
  });
