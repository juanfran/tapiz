import { describe, expect, it } from 'vitest';
import { defaultUserSettings } from '../models/auth-user.model';
import { userSettingsValidator } from './user-settings.validator';

describe('userSettingsValidator', () => {
  it('defaults wheel input mode to auto', () => {
    const existingSettings = {
      noteDefaults: defaultUserSettings.noteDefaults,
    };

    expect(userSettingsValidator.parse(existingSettings).wheelInputMode).toBe(
      'auto',
    );
  });

  it.each(['auto', 'mouse', 'trackpad'] as const)(
    'accepts %s as a wheel input mode',
    (wheelInputMode) => {
      const settings = {
        ...defaultUserSettings,
        wheelInputMode,
      };

      expect(userSettingsValidator.parse(settings).wheelInputMode).toBe(
        wheelInputMode,
      );
    },
  );

  it('rejects unsupported wheel input modes', () => {
    expect(
      userSettingsValidator.safeParse({
        ...defaultUserSettings,
        wheelInputMode: 'touchscreen',
      }).success,
    ).toBe(false);
  });
});
