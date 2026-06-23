/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 3001,
    strictPort: true,
    host: true,
    hmr: {
      // Explicitly define the HMR client port for middleware mode
      clientPort: 3001,
    },
  },
  preview: {
    port: 3001,
    strictPort: true,
    host: true
  },
  resolve: {
    alias: {
      // Set up a path alias for cleaner imports
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Generate sourcemaps for production debugging
    sourcemap: 'hidden',
  }
});
