import z from 'zod/v4';

import { newArrow } from '../validators/arrow.validator';

export type ArrowNode = z.infer<typeof newArrow>;
