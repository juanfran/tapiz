import { z } from 'zod/v4';
import { NodeValidator } from '../models/node.model.js';
import { CommonBoardValidation } from './common-board-validation.js';

const token = z.object({
  ...CommonBoardValidation,
  color: z.string().length(7).regex(/^#/).nullable(),
  backgroundColor: z.string().length(7).regex(/^#/).nullable(),
  text: z.string().max(1000),
});

export const PERSONAL_TOKEN_VALIDATOR: NodeValidator = {
  add: async (data) => {
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
      error: {
        issues: validation.error.issues.map((err) => ({
          path: err.path.filter(
            (p): p is string | number => typeof p !== 'symbol',
          ),
          message: err.message,
          code: err.code,
        })),
      },
    };
  },
  patch: async (data) => {
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
      error: {
        issues: validation.error.issues.map((err) => ({
          path: err.path.filter(
            (p): p is string | number => typeof p !== 'symbol',
          ),
          message: err.message,
          code: err.code,
        })),
      },
    };
  },
  remove: async (data) => {
    return {
      success: true,
      data,
    };
  },
};
