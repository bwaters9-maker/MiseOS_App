import { defineConfig } from 'vitest/config';

// Standalone from vite.config.ts so the app build is untouched. The pure
// function core under test (costEngine, units, fdaRounding) needs no React,
// no DOM, and no CSS pipeline — a plain node environment is enough.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
