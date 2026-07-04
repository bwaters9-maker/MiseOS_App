/**
 * src/lib/costEngine.ts
 * Recipe and ingredient cost calculations. Pure functions, no React.
 */

import { Recipe, Ingredient } from '../types';

/**
 * Total cost of one batch of `recipe`, recursing through sub-recipe lines.
 * `visited` tracks the ancestor chain of the current recursion so a cycle
 * (a recipe depending on itself, directly or through other recipes) throws
 * instead of recursing forever.
 */
export const recipeCost = (
  recipe: Recipe,
  ingredients: Ingredient[],
  recipes: Recipe[],
  visited: Set<string> = new Set(),
): number => {
  if (visited.has(recipe.id)) {
    throw new Error(`Circular reference detected: "${recipe.name}" includes itself as a sub-recipe, directly or through another recipe.`);
  }
  const nextVisited = new Set(visited);
  nextVisited.add(recipe.id);

  return recipe.lines.reduce((total, line) => {
    if (line.type === 'ingredient') {
      const ingredient = ingredients.find(i => i.id === line.refId);
      if (!ingredient) return total;
      const costPerBaseUnit = computeCostPerBaseUnit(ingredient.purchaseCost, ingredient.purchaseQty, ingredient.yieldPercent);
      return total + costPerBaseUnit * line.qty;
    }
    const subRecipe = recipes.find(r => r.id === line.refId);
    if (!subRecipe) return total;
    const subBatchCost = recipeCost(subRecipe, ingredients, recipes, nextVisited);
    const subCostPerBaseUnit = subRecipe.batchYield.qty > 0 ? subBatchCost / subRecipe.batchYield.qty : 0;
    return total + subCostPerBaseUnit * line.qty;
  }, 0);
};

export const costPerPortion = (
  recipe: Recipe,
  ingredients: Ingredient[],
  recipes: Recipe[],
): number => {
  const total = recipeCost(recipe, ingredients, recipes);
  return recipe.portions > 0 ? total / recipe.portions : total;
};

export const fcPercent = (costPerPortionValue: number, menuPrice: number): number =>
  menuPrice > 0 ? (costPerPortionValue / menuPrice) * 100 : 0;

export const suggestedPrice = (costPerPortionValue: number, targetFcPercent: number): number =>
  targetFcPercent > 0 ? costPerPortionValue / (targetFcPercent / 100) : 0;

/**
 * True if adding a line referencing `candidateSubRecipeId` inside recipe
 * `targetRecipeId` would create a cycle — either a direct self-reference,
 * or the candidate already depends (transitively) on the target.
 */
export const wouldCreateCycle = (
  targetRecipeId: string,
  candidateSubRecipeId: string,
  recipes: Recipe[],
): boolean => {
  if (targetRecipeId === candidateSubRecipeId) return true;
  return recipeDependsOn(candidateSubRecipeId, targetRecipeId, recipes);
};

const recipeDependsOn = (
  recipeId: string,
  targetId: string,
  recipes: Recipe[],
  seen: Set<string> = new Set(),
): boolean => {
  if (recipeId === targetId) return true;
  if (seen.has(recipeId)) return false;
  seen.add(recipeId);
  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) return false;
  return recipe.lines.some(line => line.type === 'recipe' && recipeDependsOn(line.refId, targetId, recipes, seen));
};

export const computeCostPerBaseUnit = (
  purchaseCost: number,
  purchaseQty: number,
  yieldPercent: number,
): number => {
  if (purchaseQty <= 0 || yieldPercent <= 0) return 0;
  return purchaseCost / (purchaseQty * (yieldPercent / 100));
};

export const calculateTrueCost = (apCost: number, yieldPercent: number): number => {
  if (!yieldPercent || yieldPercent <= 0) return apCost;
  return apCost / (yieldPercent / 100);
};
