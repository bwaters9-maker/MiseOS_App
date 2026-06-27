import { Router } from 'express';
import { getFirestore, collection, getDocs, getDoc } from 'firebase-admin/firestore';
import { canEditRecipes } from '../../middleware/authInterceptor';

/**
 * @fileoverview This file provides the logistics audit for a given recipe.
 * It's the "Logistics Checkpoint," ensuring our supply chain can support our menu.
 */

const db = getFirestore();
const router = Router();

// Middleware to ensure only executive roles can access these routes.
const requireExecutiveRole = canEditRecipes;

/**
 * Route for auditing the supply chain logistics of a specific recipe.
 *
 * SCOPE CREEP: This entire module is not defined in the Master_Feature_Manifest.txt.
 *
 * GET /logistics-audit/:recipeId
 */
router.get('/logistics-audit/:recipeId', requireExecutiveRole, async (req, res) => {
  try {
    const { recipeId } = req.params;
    const componentsRef = collection(db, 'recipes', recipeId, 'recipeComponents');
    const componentsSnapshot = await getDocs(componentsRef);

    if (componentsSnapshot.empty) {
      return res.status(200).json({ message: 'No components to audit for this recipe.', flaggedItems: [] });
    }

    // Run all ingredient and vendor lookups in parallel for efficiency.
    const auditPromises = componentsSnapshot.docs.map(async (componentDoc) => {
      const componentData = componentDoc.data();
      const ingredientRef = componentData.ingredient_id;
      if (!ingredientRef) return null;

      const ingredientDoc = await getDoc(ingredientRef);
      if (!ingredientDoc.exists()) return null;

      const ingredientData = ingredientDoc.data();
      const vendorRef = ingredientData.vendor_id;
      if (!vendorRef) return null;

      const vendorDoc = await getDoc(vendorRef);
      if (vendorDoc.exists() && vendorDoc.data().lead_time > 5) {
        return { ingredientName: ingredientData.name, vendorName: vendorDoc.data().company_name, leadTime: vendorDoc.data().lead_time };
      }
      return null;
    });

    const results = await Promise.all(auditPromises);
    const flaggedItems = results.filter(item => item !== null); // Filter out non-flagged items

    res.status(200).json({ flaggedItems });
  } catch (error) {
    res.status(500).json({ error: 'An internal error occurred during the logistics audit.', details: error.message });
  }
});

export default router;