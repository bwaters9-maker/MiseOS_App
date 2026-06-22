import express from 'express';

const router = express.Router();

/**
 * POST /detect-leak
 * Catches margin breaches by comparing actual food cost vs target food cost.
 */
router.post('/detect-leak', (req, res) => {
  const { actualCost, salePrice, targetMarginPercent } = req.body;

  if (actualCost === undefined || salePrice === undefined || targetMarginPercent === undefined) {
    return res.status(400).json({ error: 'actualCost, salePrice, and targetMarginPercent are required' });
  }

  const actualMarginPercent = ((salePrice - actualCost) / salePrice) * 100;
  const isBreach = actualMarginPercent < targetMarginPercent;

  res.json({
    actualMarginPercent: parseFloat(actualMarginPercent.toFixed(2)),
    targetMarginPercent,
    isBreach,
    leakAmount: isBreach ? parseFloat(( (targetMarginPercent / 100) * salePrice - (salePrice - actualCost) ).toFixed(2)) : 0
  });
});

export default router;
