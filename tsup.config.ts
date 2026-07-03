import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  sourcemap: true,
  minify: false,
  external: ['@coreui/internal-links'],
  banner: {
    js: '#!/usr/bin/env node',
  },
})
