/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '20mb' }));

const PORT = 3001;

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

app.post('/api/ai', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: { message: 'ANTHROPIC_API_KEY is not configured on the server.' } });
    return;
  }

  const { system, messages, max_tokens, tools } = req.body ?? {};
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: { message: 'Request body must include a "messages" array.' } });
    return;
  }

  let allowedTools;
  if (tools !== undefined) {
    if (!Array.isArray(tools) || !tools.every((t) => t && t.type === 'web_search_20250305' && t.name === 'web_search')) {
      res.status(400).json({ error: { message: 'Only the web_search tool may be requested through this proxy.' } });
      return;
    }
    allowedTools = tools;
  }

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: max_tokens ?? 1024,
        ...(system ? { system } : {}),
        ...(allowedTools ? { tools: allowedTools } : {}),
        messages,
      }),
    });

    const data = await anthropicResponse.json();

    // Anthropic's own error body is already { error: { message } } — forward it as-is.
    res.status(anthropicResponse.status).json(data);
  } catch (err) {
    console.error('Anthropic proxy request failed:', err);
    res.status(502).json({ error: { message: 'Failed to reach Anthropic API.' } });
  }
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
