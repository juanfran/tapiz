import { z } from 'zod';
import { NodeValidator, EstimationResult } from '@team-up/board-commons';
import { CommonBoardValidation } from '@team-up/board-commons/validators/common-board-validation';

const estimationBoard = z.object({
  ...CommonBoardValidation,
});

const ESTIMATION_VALIDATOR: NodeValidator = {
  add: (data) => {
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
  patch: (data) => {
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
  remove: (data) => {
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
  add: (data) => {
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
  patch: (data) => {
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
  remove: () => {
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
  add: (data, userId) => {
    const validation = result.safeParse(data.content);

    if (validation.success) {
      return {
        success: true,
        data: {
          ...data,
          content: {
            ...validation.data,
            userId,
          },
        },
      };
    }

    return {
      success: false,
    };
  },
  patch: (data, userId) => {
    const content = data.content as EstimationResult;

    if (content.userId !== userId) {
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
  remove: (data, userId, _, node) => {
    const content = node.content as EstimationResult;

    if (content.userId !== userId) {
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
