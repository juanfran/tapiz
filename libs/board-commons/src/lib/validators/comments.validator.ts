import { z } from 'zod/v4';
import type { NodeValidator } from '../models/node.model.js';

const comment = z.object({
  text: z.string(),
  userId: z.string(),
  date: z.number(),
});

const COMMENT_VALIDATOR: NodeValidator = {
  add: async (data, state) => {
    if (state.parentNode?.type !== 'note') {
      return {
        success: false,
      };
    }

    const validation = comment.safeParse(data.content);

    if (validation.success) {
      return {
        success: true,
        data: {
          ...data,
          content: {
            ...validation.data,
            userId: state.userId,
          },
        },
      };
    }

    return {
      success: false,
    };
  },
  patch: async (data, state) => {
    const validation = comment.partial().safeParse(data.content);

    if (validation.success && validation.data.userId !== state.userId) {
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
  remove: async (data, state) => {
    if (
      'userId' in state.node.content &&
      state.node.content.userId !== state.userId
    ) {
      return {
        success: false,
      };
    }

    return {
      success: true,
      data,
    };
  },
};

export const COMMENTS_VALIDATORS = [
  {
    type: 'comment',
    validator: COMMENT_VALIDATOR,
  },
] as const;
