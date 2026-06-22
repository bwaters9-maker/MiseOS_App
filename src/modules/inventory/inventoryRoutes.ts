import { Router } from 'express';
import { authorizeRoles } from '../auth/authMiddleware.js';

const router = Router();

// Mock inventory data
const INVENTORY_DATABASE: Record<string, { id: string; name: string; bulkCost: number; conversionMultiplier: number }> = {
  'ing-1': { id: 'ing-1', name: 'Salmon', bulkCost: 100, conversionMultiplier: 10 }, // e.g., 100 per 10kg bulk
  'ing-2': { id: 'ing-2', name: 'Ribeye', bulkCost: 200, conversionMultiplier: 5 },  // e.g., 200 per 5kg bulk
};

router.get('/unit-cost/:ingredientId', authorizeRoles(['Chef', 'Owner']), (req, res) => {
  const { ingredientId } = req.params;
  const item = INVENTORY_DATABASE[ingredientId];

  if (!item) {
    return res.status(404).json({ error: 'Ingredient not found' });
  }

  // Conversion math: bulk purchase cost / conversion multiplier
  const unitCost = item.bulkCost / item.conversionMultiplier;

  return res.json({
    ingredientId: item.id,
    name: item.name,
    unitCost: unitCost
  });
});

export default router;
