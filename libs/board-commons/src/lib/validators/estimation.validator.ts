import { z } from 'zod';
import { NodeValidator } from '../models/node.model.js';
import { EstimationResult } from '../models/estimation.model.js';
import { CommonBoardValidation } from './common-board-validation.js';

const estimationBoard = z.object({
  ...CommonBoardValidation,
});

const ESTIMATION_VALIDATOR: NodeValidator = {
  add: async (data) => {
    const validation = estimationBoard.safeParse(data.content);

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
  patch: async (data) => {
    const validation = estimationBoard.partial().safeParse(data.content);

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
  remove: async (data) => {
    return {
      success: true,
      data,
    };
  },
};

const story = z.array(
  z.object({
    id: z.string().uuid(),
    title: z.string().max(1000),
    description: z.string().max(1000),
    show: z.boolean(),
  }),
);

const config = z.object({
  scale: z.enum(['fibonacci', 't-shirt']),
  stories: story,
  step: z.number().int().min(0),
});

const ESTIMATION_CONFIG_VALIDATOR: NodeValidator = {
  add: async (data) => {
    const validation = config.safeParse(data.content);

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
  patch: async (data) => {
    const validation = config.partial().safeParse(data.content);

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
  remove: async () => {
    return {
      success: false,
    };
  },
};

const result = z.object({
  results: z.array(
    z.object({
      selection: z.string().max(100),
      storyId: z.string().uuid(),
    }),
  ),
  userId: z.string(),
});

const ESTIMATION_RESULT_VALIDATOR: NodeValidator = {
  add: async (data, state) => {
    const validation = result.safeParse(data.content);

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
    const content = data.content as EstimationResult;

    if (content.userId !== state.userId) {
      return {
        success: false,
      };
    }

    const validation = result.partial().safeParse(data.content);

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
    const content = state.node.content as EstimationResult;

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

export const ESTIMATION_VALIDATORS = [
  {
    type: 'estimation',
    validator: ESTIMATION_VALIDATOR,
  },
  {
    type: 'estimation.config',
    validator: ESTIMATION_CONFIG_VALIDATOR,
  },
  {
    type: 'estimation.result',
    validator: ESTIMATION_RESULT_VALIDATOR,
  },
] as const;
