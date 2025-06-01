import { settingsValidator } from '../validators/settings.validators.js';
import { z } from 'zod/v4';

export type BoardSettings = Partial<z.infer<typeof settingsValidator>>;
