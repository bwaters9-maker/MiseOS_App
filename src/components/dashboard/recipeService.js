import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config.js";

/**
 * Fetches a recipe and calculates its total cost based on live ingredient prices.
 * This is the digital equivalent of a sous chef costing out a dish before service,
 * by walking to the pantry to check the latest price on every single component.
 *
 * @param {string} recipeId The ID of the recipe to fetch and cost out.
 * @returns {Promise<object>} A combined object with the recipe details, its resolved
 * ingredients with their individual costs, and the total plate cost.
 * @throws {Error} If the recipe or any of its referenced ingredients cannot be found.
 */
export const getRecipeWithCosts = async (recipeId) => {
  // 1. Pull the master recipe card from the recipe box (`recipes` collection).
  const recipeRef = doc(db, "recipes", recipeId);
  const recipeSnap = await getDoc(recipeRef);

  if (!recipeSnap.exists()) {
    const errorMessage = `Recipe card with ID: ${recipeId} is missing from the box.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  const recipeData = recipeSnap.data();
  const ingredientsWithCosts = [];
  let totalPlateCost = 0;

  // 2. If the recipe has an ingredient list, process each item.
  if (recipeData.ingredients && recipeData.ingredients.length > 0) {
    // Use a `for...of` loop to handle async operations sequentially and ensure robust error handling.
    for (const component of recipeData.ingredients) {
      if (!component.ingredientRef || typeof component.quantity !== 'number') {
        console.warn(`Skipping malformed component in recipe ${recipeId}:`, component);
        continue;
      }

      // 3. For each ingredient, walk to the pantry (`ingredients` collection) to get its details.
      const ingredientSnap = await getDoc(component.ingredientRef);

      if (!ingredientSnap.exists()) {
        throw new Error(`Ingredient listed on recipe card not found in pantry: ${component.ingredientRef.id}`);
      }

      const ingredientData = ingredientSnap.data();
      const costPerUnit = ingredientData.cost_per_unit || 0;
      const weightedCost = component.quantity * costPerUnit;
      totalPlateCost += weightedCost;

      ingredientsWithCosts.push({
        ...ingredientData,
        id: ingredientSnap.id,
        quantity_in_recipe: component.quantity,
        weighted_cost: weightedCost,
      });
    }
  }

  // 4. Return the complete, costed-out recipe card.
  return {
    ...recipeData,
    id: recipeSnap.id,
    resolvedIngredients: ingredientsWithCosts,
    total_plate_cost: totalPlateCost,
  };
};