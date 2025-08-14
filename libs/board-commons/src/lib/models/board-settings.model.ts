import { settingsValidator } from '../validators/settings.validators.js';
import { z } from 'zod/v4';
import { TuNode } from './node.model.js';

export type BoardSettings = Partial<z.infer<typeof settingsValidator>>;

export function isSettings(node: TuNode): node is TuNode<BoardSettings> {
  return node.type === 'settings';
}
