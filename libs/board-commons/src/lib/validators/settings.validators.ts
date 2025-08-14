import { z } from 'zod/v4';
import { NodeValidator } from '../models/node.model.js';
import colorString from 'color-string';

export function colorValidator(val: string) {
  try {
    return colorString.get(val) !== null;
  } catch {
    return false;
  }
}

export const settingsValidator = z.object({
  readOnly: z.boolean().default(false),
  anonymousMode: z.boolean().default(false),
  hideNoteAuthor: z.boolean().default(false),
  allowPublicPosts: z.boolean().default(false),
  backgroundColor: z.string().refine(colorValidator).optional(),
  dotsColor: z.string().refine(colorValidator).optional(),
  boardCenter: z
    .object({
      x: z.number(),
      y: z.number(),
      zoom: z.number(),
    })
    .optional(),
});

export const SETTINGS_VALIDATOR: NodeValidator = {
  add: async (data, state) => {
    if (!state.isAdmin) {
      return {
        success: false,
      };
    }

    const setting = state.nodes.find((it) => it.type === 'settings');

    if (setting) {
      return {
        success: false,
      };
    }

    const validation = settingsValidator.safeParse(data.content);

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
    if (!state.isAdmin) {
      return {
        success: false,
      };
    }

    const validation = settingsValidator.partial().safeParse(data.content);

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
    if (!state.isAdmin) {
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
