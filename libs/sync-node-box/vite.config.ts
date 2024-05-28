/// <reference types='vitest' />
import { defineConfig } from 'vite';

import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/sync-node-box',
  plugins: [tsconfigPaths()],
  test: {
    watch: false,
    globals: true,
    cache: {
      dir: '../../node_modules/.vitest',
    },
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/sync-node-box',
      provider: 'v8',
    },
  },
});
