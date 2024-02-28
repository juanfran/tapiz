import { z } from 'zod';
import { CommonBoardValidation } from './common-board-validation.js';
import { NodeValidator } from '../models/node.model.js';
import {
  PollAnswer,
  PollAnswerNode,
  PollBoardNode,
} from '../models/poll.model.js';
import { pick } from 'remeda';
import { decrypt } from '@team-up/utils/crypto.js';

const pollBoard = z.object({
  ...CommonBoardValidation,
  mode: z.enum(['anonymous', 'public']).optional(),
  title: z.string().max(1000),
  finished: z.boolean(),
  options: z.array(
    z.object({
      id: z.string().uuid(),
      text: z.string().max(1000),
    }),
  ),
});

const POLL_VALIDATOR: NodeValidator = {
  add: async (data) => {
    const validation = pollBoard.safeParse(data.content);

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
  patch: async (data, state) => {
    const pollNode = state.node as PollBoardNode;
    let newData = data.content as Partial<PollBoardNode['content']>;

    if (
      (newData.options?.length && pollNode.content.options.length) ||
      (newData.title && pollNode.content.title) ||
      (newData.mode && pollNode.content.mode)
    ) {
      return {
        success: false,
      };
    }

    if (pollNode.content.finished && !newData.position && !newData.layer) {
      newData = pick(newData, ['position', 'layer']);
    }

    const validation = pollBoard.partial().safeParse(newData);

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

const answer = z.object({
  optionId: z.string().uuid(),
  userId: z.string().max(1000),
});

async function isValidPrivatePoll(
  userPrivateId: string,
  userId: string,
  parentPoll: PollBoardNode,
  content: PollAnswer,
) {
  const isPrivate = parentPoll.content.mode === 'anonymous';

  if (isPrivate) {
    const pollUserId = await decrypt(content.userId, userPrivateId, true);

    if (pollUserId !== userId) {
      return false;
    }
  } else {
    if (content.userId !== userId) {
      return false;
    }
  }

  return true;
}

async function hasUserVoted(
  userPrivateId: string,
  userId: string,
  parentPoll: PollBoardNode,
) {
  const isPrivate = parentPoll.content.mode === 'anonymous';

  if (isPrivate) {
    const children = (parentPoll.children ?? []) as PollAnswerNode[];
    const parseChildren = await Promise.all(
      children.map(async (a) => {
        const decrypted = await decrypt(a.content.userId, userPrivateId, true);

        return { ...a, content: { ...a.content, userId: decrypted } };
      }),
    );

    return parseChildren.some((a) => a.content.userId === userId);
  } else {
    const children = (parentPoll.children ?? []) as PollAnswerNode[];

    return children.some((a) => a.content.userId === userId);
  }
}

const POLL_ANSWER_VALIDATOR: NodeValidator = {
  add: async (data, state) => {
    const parentPoll = state.parentNode as PollBoardNode | undefined;
    const content = data.content as PollAnswer;

    if (!parentPoll || parentPoll.content.finished) {
      return {
        success: false,
      };
    }

    if (
      !(await isValidPrivatePoll(
        state.userPrivateId,
        state.userId,
        parentPoll,
        content,
      )) ||
      (await hasUserVoted(state.userPrivateId, state.userId, parentPoll))
    ) {
      return {
        success: false,
      };
    }

    const validation = answer.safeParse(data.content);

    if (validation.success) {
      return {
        success: true,
        data: {
          ...data,
          content: {
            ...validation.data,
          },
        },
      };
    }

    return {
      success: false,
    };
  },
  patch: async (data, state) => {
    const content = data.content as PollAnswer;
    const parentPoll = state.parentNode as PollBoardNode | undefined;

    if (!parentPoll || parentPoll.content.finished) {
      return {
        success: false,
      };
    }

    if (
      !(await isValidPrivatePoll(
        state.userPrivateId,
        state.userId,
        parentPoll,
        content,
      ))
    ) {
      return {
        success: false,
      };
    }

    const validation = answer.partial().safeParse(data.content);

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
    const content = state.node.content as PollAnswer;
    const parentPoll = state.parentNode as PollBoardNode | undefined;

    if (!parentPoll || parentPoll.content.finished) {
      return {
        success: false,
      };
    }

    if (
      !(await isValidPrivatePoll(
        state.userPrivateId,
        state.userId,
        parentPoll,
        content,
      ))
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

export const POLL_VALIDATORS = [
  {
    type: 'poll',
    validator: POLL_VALIDATOR,
  },
  {
    type: 'poll.answer',
    validator: POLL_ANSWER_VALIDATOR,
  },
] as const;
