import { Router } from 'express';
import { authorizeRoles } from '../auth/authMiddleware.js';

const router = Router();

router.post('/detect-leak', authorizeRoles(['Chef', 'Owner']), (req, res) => {
  const { components, salePrice, targetMargin } = req.body;

  if (!components || !Array.isArray(components) || salePrice === undefined || targetMargin === undefined) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const totalCost = components.reduce((sum: number, comp: any) => sum + (comp.cost || 0), 0);
  const actualMargin = (salePrice - totalCost) / salePrice;

  const smokeDetectorAlarm = actualMargin < targetMargin;

  return res.json({
    totalCost,
    actualMargin,
    targetMargin,
    smokeDetectorAlarm
  });
});

export default router;
