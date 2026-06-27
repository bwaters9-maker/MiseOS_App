/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { aiModel } from './src/firebaseConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// BOH AI Transcription & Culinary Logic Parsing Endpoint
app.post('/api/parse-recipe', async (req, res) => {
  try {
    const { recipeText } = req.body;
    if (!recipeText || typeof recipeText !== 'string' || !recipeText.trim()) {
      return res.status(400).json({ success: false, error: 'Recipe text cannot be empty.' });
    }

    const systemInstruction = `You are an veteran BOH Executive Chef and systems architect. Analyze standard restaurant recipe cards, handwritten prep sheets, or messy notes, and transcribe them into mathematically yield-adjusted JSON formats. Station must be strictly one of: 'Sauté', 'Grill', 'Garde Manger', 'Pastry'. If you encounter yield percents that are unspecified, default to 100. If you encounter cost estimates, map them to decimal numeric rates in costPerUnit. The response must be a JSON object.`;
    const userPrompt = `Please parse this back-of-house recipe text into a structured JSON representation. Extract ingredients (EP quantities, purchase names, and trim yields), preparation steps, station context, and estimated platter sell pricing: \n\n${recipeText}`;
    const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;

    const result = await aiModel.generateContent(fullPrompt);
    const parsedJsonText = result.response.text().trim() || '{}';
    const parsedData = JSON.parse(parsedJsonText);

    // Sanitize station value
    const allowedStations = ['Sauté', 'Grill', 'Garde Manger', 'Pastry'];
    if (!allowedStations.includes(parsedData.station)) {
      parsedData.station = 'Garde Manger'; // Fail-safe default
    }

    return res.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error('Gemini Recipe Parser failed:', err);
    return res.status(500).json({ 
      success: false, 
      error: err?.message || 'Server failed to process recipe text with Gemini.' 
    });
  }
});

const PORT = 3001;

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
    console.log('MiseOS is in PRODUCTION mode. Serving static assets from ./dist');
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
    console.log('MiseOS is in DEVELOPMENT mode. Integrating Vite middleware for HMR.');

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Development server running on http://localhost:${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
