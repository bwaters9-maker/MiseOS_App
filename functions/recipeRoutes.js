import { Router } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { createRecipe as remixRecipe, updateRecipe as refineRecipe } from './recipeController.js';
import { requirePermission } from './lib/middleware/authInterceptor.js';
import { getRecipeFinancials } from './costCalculator.js';

/**
 * @fileoverview API route definitions for the Recipe Builder module.
 * This file acts as the "expo" line, directing incoming HTTP requests (tickets)
 * to the correct station (controller function) for processing.
 */

const db = getFirestore();
const router = Router();

/**
 * Route for "The Remix": Creating a new recipe.
 * POST /remix
 * Body: { recipeData: object, componentsData: Array<object> }
 */
router.post('/remix', requirePermission('recipe_remix'), async (req, res) => {
  try {
    const { recipeData, componentsData } = req.body;
    if (!recipeData || !componentsData) {
      return res.status(400).json({ error: 'Missing recipeData or componentsData in request body.' });
    }
    const newRecipeId = await remixRecipe(recipeData, componentsData);
    res.status(201).json({ message: 'Recipe remixed successfully.', recipeId: newRecipeId });
  } catch (error) {
    // Catches validation errors or other issues from the controller.
    res.status(400).json({ error: error.message });
  }
});

/**
 * Route for "The Refine": Updating an existing recipe.
 * PATCH /refine
 * Body: { recipeId: string, ...updateData }
 */
router.patch('/refine', requirePermission('recipe_refine'), async (req, res) => {
  try {
    const { recipeId, ...updateData } = req.body;
    if (!recipeId) {
      return res.status(400).json({ error: 'Missing recipeId in request body.' });
    }
    await refineRecipe(recipeId, updateData);
    res.status(200).json({ message: `Recipe ${recipeId} refined successfully.` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Route for "The Accountant": Calculating live recipe financials.
 * GET /financials/:id?price=<value>
 */
router.get('/financials/:id', requirePermission('recipe_read'), async (req, res) => {
  try {
    const { id } = req.params;
    const { price } = req.query;

    if (!price) {
      return res.status(400).json({ error: 'Missing price query parameter.' });
    }

    const menuItemPrice = parseFloat(price);
    if (isNaN(menuItemPrice)) {
      return res.status(400).json({ error: 'Invalid price query parameter. Must be a number.' });
    }

    const financials = await getRecipeFinancials(id, menuItemPrice);
    res.status(200).json(financials);
  } catch (error) {
    res.status(500).json({ error: 'An internal error occurred while calculating financials.', details: error.message });
  }
});

/**
 * Route for "The Menu Link": Attaching a recipe to the menu.
 * POST /menu-link
 * Body: { name: string, recipe_id: string, price: number }
 */
router.post('/menu-link', requirePermission('master_pantry_edit'), async (req, res) => {
  try {
    const { name, recipe_id, price } = req.body;

    if (!name || !recipe_id || price === undefined) {
      return res.status(400).json({ error: 'Missing name, recipe_id, or price in request body.' });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'Invalid price. Must be a non-negative number.' });
    }

    // Verify the recipe card exists before putting it on the menu.
    const recipeRef = db.collection('recipes').doc(recipe_id);
    const recipeDoc = await recipeRef.get();

    if (!recipeDoc.exists) {
      return res.status(404).json({ error: `Recipe with ID ${recipe_id} not found.` });
    }

    const newMenuItem = { name, recipe_id: recipeRef, price: parsedPrice, status: 'inactive' };
    const menuItemRef = await db.collection('menuItems').add(newMenuItem);

    res.status(201).json({ message: 'Menu item linked successfully.', menuItemId: menuItemRef.id });
  } catch (error) {
    res.status(500).json({ error: 'An internal error occurred while linking the menu item.', details: error.message });
  }
});

export default router;