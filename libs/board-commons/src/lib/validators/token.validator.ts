import { z } from 'zod';
import { NodeValidator } from '../models/node.model';

const token = z.object({
  color: z.string().length(7).regex(/^#/).nullable(),
  backgroundColor: z.string().length(7).regex(/^#/).nullable(),
  text: z.string().max(1000),
  position: z.object({
    x: z.number().safe(),
    y: z.number().safe(),
  }),
});

export const PERSONAL_TOKEN_VALIDATOR: NodeValidator = {
  add: (data) => {
    const validation = token.safeParse(data.content);

    if (validation.success) {
      return {
        success: true,
        data: {
          ...data,
          content: validation.data,
        },
      };
    }

    return {
      success: false,
    };
  },
  patch: (data) => {
    const validation = token.partial().safeParse(data.content);

    if (validation.success) {
      return {
        success: true,
        data: {
          ...data,
          content: validation.data,
        },
      };
    }

    return {
      success: false,
    };
  },
  remove: (data) => {
    return {
      success: true,
      data,
    };
  },
};
