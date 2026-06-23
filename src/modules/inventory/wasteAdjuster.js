import express from 'express';

const router = express.Router();

/**
 * POST /calculate-yield-cost
 * Handles trim loss premiums by calculating effective cost based on yield percentage.
 */
router.post('/calculate-yield-cost', (req, res) => {
  const { purchasePrice, yieldPercent } = req.body;

  if (purchasePrice === undefined || yieldPercent === undefined) {
    return res.status(400).json({ error: 'purchasePrice and yieldPercent are required' });
  }

  if (yieldPercent <= 0 || yieldPercent > 100) {
    return res.status(400).json({ error: 'yieldPercent must be between 1 and 100' });
  }

  // Effective Cost = Purchase Price / (Yield % / 100)
  const effectiveCost = purchasePrice / (yieldPercent / 100);
  const trimLossPremium = effectiveCost - purchasePrice;

  res.json({
    purchasePrice,
    yieldPercent,
    effectiveCost: parseFloat(effectiveCost.toFixed(2)),
    trimLossPremium: parseFloat(trimLossPremium.toFixed(2))
  });
});

export default router;
