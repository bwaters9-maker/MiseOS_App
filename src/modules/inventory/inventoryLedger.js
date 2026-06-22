import express from 'express';

const router = express.Router();

/**
 * Middleware to gate access to executive roles.
 */
const executiveGate = (req, res, next) => {
  const userRole = req.headers['x-user-role'];
  if (userRole === 'executive') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Executive access required' });
  }
};

// Mock data for ingredients
const inventory = [
  { id: '1', name: 'Atlantic Salmon Fillet', unitCost: 36.00 },
  { id: '2', name: 'Fresh Avocado', unitCost: 9.00 }
];

/**
 * GET /unit-cost/:ingredientId
 * Returns the unit cost for a specific ingredient.
 */
router.get('/unit-cost/:ingredientId', executiveGate, (req, res) => {
  const { ingredientId } = req.params;
  const item = inventory.find(i => i.id === ingredientId);

  if (item) {
    res.json({ ingredientId: item.id, unitCost: item.unitCost });
  } else {
    res.status(404).json({ error: 'Ingredient not found' });
  }
});

/**
 * PUT /update-cost
 * Updates the unit cost for an ingredient.
 */
router.put('/update-cost', executiveGate, (req, res) => {
  const { ingredientId, newCost } = req.body;

  if (!ingredientId || newCost === undefined) {
    return res.status(400).json({ error: 'ingredientId and newCost are required' });
  }

  const itemIndex = inventory.findIndex(i => i.id === ingredientId);
  if (itemIndex !== -1) {
    inventory[itemIndex].unitCost = newCost;
    res.json({ success: true, ingredientId, updatedCost: newCost });
  } else {
    res.status(404).json({ error: 'Ingredient not found' });
  }
});

export default router;
