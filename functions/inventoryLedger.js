import { Router } from 'express';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase-admin/firestore';
import { canEditRecipes } from '../../middleware/authInterceptor';

/**
 * @fileoverview This file provides the inventory ledger for managing ingredient costs.
 * It's the "Receiving Dock," where executives can check and update live pricing.
 */

const db = getFirestore();
const router = Router();

// Middleware to ensure only executive roles can access these routes.
const requireExecutiveRole = canEditRecipes;

/**
 * Route for getting the current unit cost of a single ingredient.
 * This is like asking the bookkeeper for the price of an item from the master ledger.
 *
 * GET /unit-cost/:ingredientId
 */
router.get('/unit-cost/:ingredientId', requireExecutiveRole, async (req, res) => {
  try {
    const { ingredientId } = req.params;
    const ingredientRef = doc(db, 'ingredients', ingredientId);
    const ingredientDoc = await getDoc(ingredientRef);

    if (!ingredientDoc.exists()) {
      return res.status(404).json({ error: 'Ingredient not found.' });
    }

    res.status(200).json({ cost_per_unit: ingredientDoc.data().cost_per_unit || 0 });
  } catch (error) {
    res.status(500).json({ error: 'An internal error occurred.', details: error.message });
  }
});

/**
 * Route for updating the cost of a single ingredient.
 * This is the Executive Chef making a price correction after reviewing an invoice.
 *
 * PUT /update-cost
 * Body: { ingredientId: string, newCost: number }
 */
router.put('/update-cost', requireExecutiveRole, async (req, res) => {
  try {
    const { ingredientId, newCost } = req.body;
    if (!ingredientId || newCost === undefined || isNaN(parseFloat(newCost)) || newCost < 0) {
      return res.status(400).json({ error: 'Invalid request. Requires ingredientId and a non-negative newCost.' });
    }

    const ingredientRef = doc(db, 'ingredients', ingredientId);
    await updateDoc(ingredientRef, { cost_per_unit: parseFloat(newCost) });

    res.status(200).json({ message: 'Ingredient cost updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'An internal error occurred.', details: error.message });
  }
});

export default router;