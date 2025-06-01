import { z } from 'zod/v4';

export const PositionValidation = {
  x: z.number(),
  y: z.number(),
};

export const LayerValidator = z.number();

export const CommonBoardValidation = {
  position: z.object(PositionValidation),
  layer: LayerValidator,
};

export const SizeValidator = {
  width: z.number(),
  height: z.number(),
};
