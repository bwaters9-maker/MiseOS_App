import { getFirestore, doc, collection, query, where, getDocs, documentId } from 'firebase/firestore';

const db = getFirestore();

/**
 * @fileoverview This utility acts as the kitchen's head accountant, recursively
 * calculating the exact cost of a recipe, including any sub-recipes (mise en place).
 */

/**
 * Internal recursive function to calculate the cost of a single recipe.
 * It traverses down through sub-recipes to get a true total cost.
 *
 * @param {string} recipeId The ID of the recipe to cost out.
 * @param {Set<string>} visited A set to track visited recipes and prevent circular dependencies.
 * @returns {Promise<number>} The total cost of the recipe.
 */
const _calculateRecursiveCost = async (recipeId, visited) => {
  // This is like checking if a recipe for hollandaise calls for hollandaise.
  // It prevents an infinite loop that would burn out the kitchen.
  if (visited.has(recipeId)) {
    throw new Error(`Circular recipe dependency detected: ${recipeId}`);
  }
  visited.add(recipeId);

  const componentsRef = collection(db, 'recipes', recipeId, 'recipeComponents');
  const componentsSnapshot = await getDocs(componentsRef);
  const components = componentsSnapshot.docs.map(doc => doc.data());

  if (components.length === 0) {
    return 0; // A recipe with no components has no cost.
  }

  // 1. Prep the shopping list: Get all unique ingredient IDs from this recipe level.
  const ingredientIds = components
    .filter(comp => comp.ingredient_id?.startsWith('ingredients/'))
    .map(comp => comp.ingredient_id.split('/')[1]);

  // 2. Go to the market: Fetch the live cost for all direct ingredients at once.
  let ingredientCostMap = {};
  if (ingredientIds.length > 0) {
    const ingredientsQuery = query(collection(db, 'ingredients'), where(documentId(), 'in', ingredientIds));
    const ingredientsSnapshot = await getDocs(ingredientsQuery);
    ingredientsSnapshot.forEach(doc => {
      ingredientCostMap[doc.id] = doc.data().cost_per_unit || 0;
    });
  }

  // 3. Run the numbers: Calculate total cost by summing direct ingredients and sub-recipes.
  let totalCost = 0;
  for (const component of components) {
    const [collectionName, docId] = component.ingredient_id.split('/');

    if (collectionName === 'ingredients') {
      const cost = ingredientCostMap[docId] || 0;
      totalCost += component.quantity * cost;
    } else if (collectionName === 'recipes') {
      // This is the recursive step: costing out a "mother sauce" before the final dish.
      const subRecipeCost = await _calculateRecursiveCost(docId, new Set(visited));
      
      // To get the cost contribution, we need the cost-per-portion of the sub-recipe.
      const subRecipeDoc = await getDoc(doc(db, 'recipes', docId));
      if (subRecipeDoc.exists()) {
        const subRecipeData = subRecipeDoc.data();
        const yield = subRecipeData.yield > 0 ? subRecipeData.yield : 1;
        const costPerPortion = subRecipeCost / yield;
        totalCost += component.quantity * costPerPortion;
      }
    }
  }

  return totalCost;
};

/**
 * Calculates the total cost of a recipe by recursively costing its components.
 * This is the public-facing entry point for the cost calculation.
 */
export const calculateRecipeCost = async (recipeId) => {
  return await _calculateRecursiveCost(recipeId, new Set());
};

/**
 * Provides a full financial overview of a recipe against a menu price.
 */
export const getRecipeFinancials = async (recipeId, menuItemPrice) => {
  const totalCost = await calculateRecipeCost(recipeId);
  const profitMargin = menuItemPrice > 0 ? (menuItemPrice - totalCost) / menuItemPrice : 0;

  return {
    totalCost,
    profitMargin,
    menuItemPrice,
  };
};