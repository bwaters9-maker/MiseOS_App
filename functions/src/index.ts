/**
 * @fileoverview This is the main entry point for the MiseOS backend services.
 * It sets up the main kitchen pass (the Express server) and directs incoming
 * orders (API requests) to the correct stations (routers).
 */

import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';

// Direct module imports for a clean, non-aliased structure.
import recipeRoutes from './modules/recipe_builder/recipeRoutes.js';
import curationRoutes from './modules/curation_rail/conceptRoutes.js';
import inventoryLedgerRoutes from './modules/inventory/inventoryLedger.js';
import wasteAdjusterRoutes from './modules/inventory/wasteAdjuster.js';
import productionRoutes from './modules/production/batchScaler.js';
import strategyRoutes from './modules/menu_strategy/index.js';

// Log a clean system-boot message upon successful server initialization.
console.log('\x1b[32m%s\x1b[0m', 'MiseOS Workspace Active: Executive Station Secure');
// As per the Vite config, the frontend is served on port 3001.
// This log provides a clean access point for the developer.
console.log('Frontend Workspace available at: http://localhost:3001');

// Initialize the main kitchen pass.
const app = express();

// Apply middleware. This is like setting up the basic rules for the pass.
app.use(cors({ origin: true }));
app.use(express.json());

// Connect the station expo lines to the main pass. Each module has a dedicated,
// clearly defined namespace.
app.use('/api/recipes', recipeRoutes);
app.use('/api/concepts', curationRoutes);
app.use('/api/financials', inventoryLedgerRoutes);
app.use('/api/financials', wasteAdjusterRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/strategy', strategyRoutes);

// Expose the main pass to the outside world as a single, unified API endpoint.
export const api = functions.https.onRequest(app);