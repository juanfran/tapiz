import { z } from 'zod';

const panel = z.object({
  title: z.string().max(1000),
  position: z.object({
    x: z.number().safe(),
    y: z.number().safe(),
  }),
  width: z.number().nonnegative().safe(),
  height: z.number().nonnegative().safe(),
  color: z.string().min(4).max(7),
});

export const patchPanel = panel.partial().extend({
  id: z.string().max(255),
});

export const newPanel = panel
  .partial()
  .extend({
    id: z.string().max(255),
  })
  .required({
    position: true,
    width: true,
    height: true,
    color: true,
  });
