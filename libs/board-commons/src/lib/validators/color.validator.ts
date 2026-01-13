import colorString from 'color-string';
import { z } from 'zod/v4';

export function colorValidator(val: string) {
  try {
    return colorString.get(val) !== null;
  } catch {
    return false;
  }
}

export const colorSchema = z.string().refine(colorValidator);
export const nullableColorSchema = colorSchema.nullable();
export const optionalColorSchema = colorSchema.optional();
export const nullableOptionalColorSchema = colorSchema.nullable().optional();
