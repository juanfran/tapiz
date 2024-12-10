import { settingsValidator } from '../validators/settings.validators.js';
import { z } from 'zod';

export type BoardSettings = Partial<z.infer<typeof settingsValidator>>;
