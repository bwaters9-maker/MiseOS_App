/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { initializeApp } from 'firebase-admin/app';
import { handleAiProxyRequest } from './functions/src/aiProxyHandler.ts';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '20mb' }));

const PORT = 3001;

// Enough for verifyIdToken() (JWT signature check against Google's
// public keys) — does not need full service-account credentials, so
// local dev needs no service account key just to enforce the same
// auth check the deployed Cloud Function enforces.
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error('FATAL: FIREBASE_PROJECT_ID or VITE_FIREBASE_PROJECT_ID must be set.');
  process.exit(1);
}
initializeApp({ projectId });

app.post('/api/ai', async (req, res) => {
  const result = await handleAiProxyRequest(
    { authHeader: req.headers.authorization, body: req.body ?? {} },
    process.env.ANTHROPIC_API_KEY
  );
  res.status(result.status).json(result.body);
});

async function startServer() {
  // Startup validation for NODE_ENV to prevent misconfiguration.
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'development') {
    const errorMessage = `FATAL: NODE_ENV is not set to 'production' or 'development'. Current value: "${process.env.NODE_ENV}".`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  const isProd = process.env.NODE_ENV === 'production';

  // --- Dynamic Environment Routing ---
  if (isProd) {
    // PRODUCTION: Serve the pre-built, static menu from the 'dist' folder.
    // This is the equivalent of a locked-down, high-performance service line.
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
    console.log('IncendiumPhi is in PRODUCTION mode. Serving static assets from ./dist');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Production server running on http://localhost:${PORT}`);
    });
  } else {
    // DEVELOPMENT: Use Vite as a middleware for a dynamic, hot-reloading test kitchen.
    // This allows for real-time recipe development without full rebuilds.
    const server = http.createServer(app);
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log('IncendiumPhi is in DEVELOPMENT mode. Integrating Vite middleware for HMR.');

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Development server running on http://localhost:${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
