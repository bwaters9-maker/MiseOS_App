import express from 'express';

const router = express.Router();

/**
 * Production Batch Scaling Suite
 * Handles recipe scaling and yield adjustments for BOH operations.
 */

/**
 * POST /scale
 * Scales a recipe's ingredients based on target covers.
 */
router.post('/scale', (req, res) => {
  const { recipe, targetCovers } = req.body;

  if (!recipe || !targetCovers) {
    return res.status(400).json({ error: 'Recipe and targetCovers are required.' });
  }

  const factor = targetCovers / (recipe.originalCovers || 1);

  const scaledIngredients = (recipe.ingredients || []).map(ing => ({
    ...ing,
    scaledQuantity: parseFloat((ing.quantity * factor).toFixed(3)),
    scaledUnit: ing.unit
  }));

  res.json({
    recipeId: recipe.id,
    name: recipe.name,
    originalCovers: recipe.originalCovers,
    targetCovers: parseInt(targetCovers),
    scaleFactor: factor,
    ingredients: scaledIngredients
  });
});

/**
 * GET /health
 * Simple health check for the production module.
 */
router.get('/health', (req, res) => {
  res.json({ status: 'UP', module: 'Production Batch Scaling Suite' });
});

export default router;
