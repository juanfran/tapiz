import { z } from 'zod';
import type { NodeValidator } from '../models/node.model.js';
import type { Comment } from '../models/comments.model.js';

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
    const content = data.content as Comment;

    if (content.userId !== state.userId) {
      return {
        success: false,
      };
    }

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
  remove: async (data, state) => {
    const content = state.node.content as Comment;

    if (content.userId !== state.userId) {
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
