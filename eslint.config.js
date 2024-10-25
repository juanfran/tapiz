import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import nxEslintPlugin from '@nx/eslint-plugin';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  { plugins: { '@nx': nxEslintPlugin } },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: 'scope:web',
              onlyDependOnLibsWithTags: [
                'scope:web',
                'type:util',
                'type:ui',
                'type:feature',
              ],
            },
            {
              sourceTag: 'scope:server',
              onlyDependOnLibsWithTags: [
                'scope:server',
                'type:util',
                'type:feature',
              ],
              bannedExternalImports: ['@angular/*'],
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:ui',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui', 'type:util'],
            },
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['type:util'],
            },
          ],
        },
      ],
    },
  },
  ...compat
    .config({
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:@nx/typescript',
        'prettier',
      ],
    })
    .map((config) => ({
      ...config,
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        ...config.rules,
        '@typescript-eslint/no-unused-vars': ['error'],
        'no-multiple-empty-lines': [2, { max: 1 }],
        quotes: ['error', 'single', { avoidEscape: true }],
        '@typescript-eslint/no-extra-semi': 'error',
        'no-extra-semi': 'off',
      },
    })),
  ...compat.config({ extends: ['plugin:@nx/javascript'] }).map((config) => ({
    ...config,
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      ...config.rules,
      '@typescript-eslint/no-extra-semi': 'error',
      'no-extra-semi': 'off',
    },
  })),
  { ignores: ['**/environment*.ts', '**/eslint.config.js'] },
];
