import { Router } from 'express';
import { canEditRecipes } from '../../middleware/authInterceptor.js';

/**
 * @fileoverview This file provides the waste adjustment calculator.
 * It's the "Butcher's Yield Test," calculating the true cost of an ingredient
 * after accounting for trim and fabrication waste.
 */

const router = Router();

// Middleware to ensure only executive roles can access these routes.
const requireExecutiveRole = canEditRecipes;

/**
 * Route for calculating the true, inflation-adjusted cost of an ingredient based on its yield.
 *
 * POST /calculate-yield-cost
 * Body: { purchaseCost: number, purchaseQuantity: number, yieldPercent: number }
 */
router.post('/calculate-yield-cost', requireExecutiveRole, async (req, res) => {
  try {
    const { purchaseCost, purchaseQuantity, yieldPercent } = req.body;

    // Input validation
    if (purchaseCost === undefined || purchaseQuantity === undefined || yieldPercent === undefined) {
      return res.status(400).json({ error: 'Missing purchaseCost, purchaseQuantity, or yieldPercent.' });
    }
    const pc = parseFloat(purchaseCost);
    const pq = parseFloat(purchaseQuantity);
    const yp = parseFloat(yieldPercent);

    if (isNaN(pc) || isNaN(pq) || isNaN(yp) || pc < 0 || pq <= 0) {
      return res.status(400).json({ error: 'Inputs must be valid, positive numbers.' });
    }
    if (yp <= 0 || yp > 100) {
      return res.status(400).json({ error: 'Yield percent must be between 0 (exclusive) and 100 (inclusive).' });
    }

    // Calculation
    const ediblePortionQuantity = pq * (yp / 100);
    const trueCostPerUnit = pc / ediblePortionQuantity;

    res.status(200).json({ trueCostPerUnit: parseFloat(trueCostPerUnit.toFixed(4)) });
  } catch (error) {
    res.status(500).json({ error: 'An internal error occurred.', details: error.message });
  }
});

export default router;