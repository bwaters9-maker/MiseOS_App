import { Router } from 'express';
import { getFirestore, collection, getDocs } from 'firebase-admin/firestore';
import { canEditRecipes } from '../../middleware/authInterceptor';
import { calculateRecipeCost } from '../recipe_builder/costCalculator.js';

/**
 * @fileoverview This file provides the logic for scaling recipes for bulk production.
 * It's the "Banquet Production" station, turning a single recipe into a large-scale prep list.
 */

const db = getFirestore();
const router = Router();

// Middleware to ensure only executive roles can access these routes.
const requireExecutiveRole = canEditRecipes;

/**
 * Route for scaling a recipe's components and calculating total batch cost.
 *
 * SCOPE CREEP: This feature is not defined in the Master_Feature_Manifest.txt.
 *
 * POST /scale-production
 * Body: { recipeId: string, multiplier: number }
 */
router.post('/scale-production', requireExecutiveRole, async (req, res) => {
  try {
    const { recipeId, multiplier } = req.body;

    // Validation as per SCHEMA_SCALING.md
    if (!recipeId || !multiplier || isNaN(parseFloat(multiplier)) || multiplier <= 1) {
      return res.status(400).json({ error: 'Invalid request. Requires a recipeId and a multiplier greater than 1.' });
    }

    const scaleFactor = parseFloat(multiplier);

    // 1. Fetch all components for the base recipe.
    const componentsRef = collection(db, 'recipes', recipeId, 'recipeComponents');
    const componentsSnapshot = await getDocs(componentsRef);

    if (componentsSnapshot.empty) {
      return res.status(404).json({ error: 'Recipe has no components to scale.' });
    }

    // 2. Map the component quantities linearly.
    const scaledComponents = componentsSnapshot.docs.map(doc => {
      const component = doc.data();
      return { ...component, quantity: component.quantity * scaleFactor };
    });

    // 3. Calculate the total estimated batch cost.
    const singleBatchCost = await calculateRecipeCost(recipeId);
    const totalBatchCost = singleBatchCost * scaleFactor;

    res.status(200).json({ scaledComponents, totalBatchCost: parseFloat(totalBatchCost.toFixed(2)) });
  } catch (error) {
    res.status(500).json({ error: 'An internal error occurred during scaling.', details: error.message });
  }
});

export default router;