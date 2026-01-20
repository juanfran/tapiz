import { z } from 'zod/v4';
import { NodeValidator } from '../models/node.model.js';

const timer = z.object({
  startTime: z.string().datetime().optional(),
  remainingTime: z.number().min(0).optional(),
  active: z.boolean().optional(),
});

const TIMER_VALIDATOR: NodeValidator = {
  add: async (data, state) => {
    // only one timer node is allowed
    const node = state.nodes.find((it) => it.id === data.id);

    if (node) {
      return {
        success: false,
      };
    }

    const validation = timer.safeParse(data.content);

    if (validation.success && data.id === 'timer') {
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
      error: validation.success
        ? undefined
        : {
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
    const validation = timer.safeParse(data.content);

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

export const TIMER_VALIDATORS = [
  {
    type: 'timer',
    validator: TIMER_VALIDATOR,
  },
] as const;
