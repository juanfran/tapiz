import z from 'zod/v4';

import {
  arrowAttachment,
  arrowHead,
  newArrow,
} from '../validators/arrow.validator.js';

export type ArrowNode = z.infer<typeof newArrow>;
export type ArrowAttachment = z.infer<typeof arrowAttachment>;
export type ArrowHead = z.infer<typeof arrowHead>;
