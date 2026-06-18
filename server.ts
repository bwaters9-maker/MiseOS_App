/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Shared Gemini Client Helper
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// BOH AI Transcription & Culinary Logic Parsing Endpoint
app.post('/api/parse-recipe', async (req, res) => {
  try {
    const { recipeText } = req.body;
    if (!recipeText || typeof recipeText !== 'string' || !recipeText.trim()) {
      return res.status(400).json({ success: false, error: 'Recipe text cannot be empty.' });
    }

    const ai = getAi();
    
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Please parse this back-of-house recipe text into a structured JSON representation matching the required schema. Extract ingredients (EP quantities, purchase names, and trim yields), preparation steps, station context, and estimated platter sell pricing: \n\n${recipeText}`,
      config: {
        systemInstruction: `You are an veteran BOH Executive Chef and systems architect. Analyze standard restaurant recipe cards, handwritten prep sheets, or messy notes, and transcribe them into mathematically yield-adjusted JSON formats. Station must be strictly one of: 'Sauté', 'Grill', 'Garde Manger', 'Pastry'. If you encounter yield percents that are unspecified, default to 100. If you encounter cost estimates, map them to decimal numeric rates in costPerUnit.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             name: { 
               type: Type.STRING,
               description: 'The descriptive culinary name of the recipe dish.'
             },
             originalCovers: { 
               type: Type.INTEGER,
               description: 'The baseline number of portions/covers this batch recipe satisfies (default to 4 if not readable).'
             },
             station: { 
               type: Type.STRING,
               description: 'Assigned prep station. Must match: "Sauté", "Grill", "Garde Manger", or "Pastry".'
             },
             ingredients: {
               type: Type.ARRAY,
               items: {
                 type: Type.OBJECT,
                 properties: {
                   name: { type: Type.STRING, description: 'Wholesale purchasing name.' },
                   quantity: { type: Type.NUMBER, description: 'Ingredient volume or weight used on the line (EP).' },
                   unit: { type: Type.STRING, description: 'Material unit symbol, e.g. "kg", "g", "L", "pcs", "portions".' },
                   costPerUnit: { type: Type.NUMBER, description: 'Wholesale unit purchase rate.' },
                   purchaseUnit: { type: Type.STRING, description: 'Baseline purchasing unit, e.g. "kg", "L", "each".' },
                   yieldPercent: { 
                     type: Type.INTEGER, 
                     description: 'Estimated production yield after bone/skin/fat removal (50-100%). Default to 100 if none.' 
                   }
                 },
                 required: ['name', 'quantity', 'unit', 'costPerUnit', 'purchaseUnit', 'yieldPercent']
               }
             },
             steps: {
               type: Type.ARRAY,
               items: { type: Type.STRING },
               description: 'Sequential preparation commands and line plating steps.'
             },
             salePrice: { 
               type: Type.NUMBER, 
               description: 'Proposed retail listing menu price of the dish (default to 15.00 if unmentioned).' 
             }
          },
          required: ['name', 'originalCovers', 'station', 'ingredients', 'steps']
        }
      }
    });

    const parsedJsonText = response.text?.trim() || '{}';
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
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProd) {
    // Dynamically require Vite in development to bind its middleware
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
    console.log('Integrated Vite HMR middleware client.');

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`MiseOS full-stack server running strictly on http://localhost:${PORT}`);
    });
  } else {
    // Serve production static assets compiled to 'dist'
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
    console.log('Serving production-ready precompiled static bundles.');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`MiseOS full-stack server running strictly on http://localhost:${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
