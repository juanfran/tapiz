import { z } from 'zod/v4';
import {
  defaultUserSettings,
  noteFontFamilyValues,
} from '../models/auth-user.model.js';
import { colorSchema } from './color.validator.js';

export const userSettingsValidator = z.object({
  noteDefaults: z.object({
    backgroundColor: colorSchema.default(
      defaultUserSettings.noteDefaults.backgroundColor,
    ),
    textColor: colorSchema.default(defaultUserSettings.noteDefaults.textColor),
    fontFamily: z
      .enum(noteFontFamilyValues)
      .default(defaultUserSettings.noteDefaults.fontFamily),
    bold: z.boolean().default(defaultUserSettings.noteDefaults.bold),
    italic: z.boolean().default(defaultUserSettings.noteDefaults.italic),
  }),
});
