import { describe, expect, it } from 'vitest';
import {
  defaultUserSettings,
  withDefaultUserSettings,
} from './auth-user.model';

describe('withDefaultUserSettings', () => {
  it('defaults wheel input mode to auto for existing users', () => {
    const existingSettings = {
      noteDefaults: defaultUserSettings.noteDefaults,
    };

    expect(withDefaultUserSettings(existingSettings).wheelInputMode).toBe(
      'auto',
    );
  });
});
