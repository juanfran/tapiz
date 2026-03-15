/// <reference types='vitest' />
import { defineConfig } from 'vite';

import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/board-commons',
  plugins: [tsconfigPaths()],
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/board-commons',
      provider: 'v8',
    },
  },
});
