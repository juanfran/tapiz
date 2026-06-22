export const noteFontFamilyValues = [
  '"Inter", -apple-system, system-ui, sans-serif',
  'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;',
  'ui-serif, serif',
  'Dank Mono, Operator Mono, Inconsolata, Fira Mono, ui-monospace, SF Mono, Monaco, Droid Sans Mono, Source Code Pro, Cascadia Code, Menlo, Consolas, DejaVu Sans Mono, monospace',
  'Caveat, cursive',
] as const;

export const noteFontFamilyOptions = [
  {
    name: 'Default',
    value: noteFontFamilyValues[0],
  },
  {
    name: 'Sans',
    value: noteFontFamilyValues[1],
  },
  {
    name: 'Serif',
    value: noteFontFamilyValues[2],
  },
  {
    name: 'Mono',
    value: noteFontFamilyValues[3],
  },
  {
    name: 'Handwriting',
    value: noteFontFamilyValues[4],
  },
] as const;

export const defaultNoteFontFamily = noteFontFamilyValues[0];

export type NoteFontFamily = (typeof noteFontFamilyValues)[number];

export interface UserNoteDefaults {
  backgroundColor: string;
  textColor: string;
  fontFamily: NoteFontFamily;
  bold: boolean;
  italic: boolean;
}

export interface UserSettings {
  noteDefaults: UserNoteDefaults;
}

export const defaultUserSettings: UserSettings = {
  noteDefaults: {
    backgroundColor: '#fbb980',
    textColor: '#000000',
    fontFamily: defaultNoteFontFamily,
    bold: false,
    italic: false,
  },
};

export function withDefaultUserSettings(
  settings?: Partial<UserSettings> | null,
): UserSettings {
  return {
    ...defaultUserSettings,
    ...settings,
    noteDefaults: {
      ...defaultUserSettings.noteDefaults,
      ...settings?.noteDefaults,
    },
  };
}

export interface AuthUserModel {
  name: string;
  picture: string;
  id: string;
  settings: UserSettings;
}
