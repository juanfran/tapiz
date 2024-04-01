import { z } from 'zod';

export const PositionValidation = {
  x: z.number().safe(),
  y: z.number().safe(),
};

export const LayerValidator = z.number().safe();

export const CommonBoardValidation = {
  position: z.object(PositionValidation),
  layer: LayerValidator,
};

export const SizeValidator = {
  width: z.number().safe(),
  height: z.number().safe(),
};
