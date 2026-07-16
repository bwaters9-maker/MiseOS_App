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
      const costPerBaseUnit = computeCostPerBaseUnit(ingredient.purchaseCost, ingredient.purchaseQty, ingredient.yieldPercent, ingredient.pieceWeightG);
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

/**
 * Cost per canonical base unit (g / ml / each).
 *
 * When `pieceWeightG` is present (portioned weight product, e.g. 6 oz
 * breasts), the rate is piece-true: the pack yields floor(qty / spec) whole
 * pieces, the shortfall is unusable pack-out, and cost per gram is derived
 * from cost per piece — what a plate actually pays. Randoms and unspec'd
 * product keep the plain weight rate. A spec too large for the pack
 * (floor = 0) falls back to the weight rate rather than dividing by zero.
 */
export const computeCostPerBaseUnit = (
  purchaseCost: number,
  purchaseQty: number,
  yieldPercent: number,
  pieceWeightG?: number,
): number => {
  if (purchaseQty <= 0 || yieldPercent <= 0) return 0;
  if (pieceWeightG != null && pieceWeightG > 0) {
    const pieces = Math.floor(purchaseQty / pieceWeightG);
    if (pieces >= 1) {
      const costPerPiece = purchaseCost / pieces;
      return costPerPiece / pieceWeightG / (yieldPercent / 100);
    }
  }
  return purchaseCost / (purchaseQty * (yieldPercent / 100));
};

export const calculateTrueCost = (apCost: number, yieldPercent: number): number => {
  if (!yieldPercent || yieldPercent <= 0) return apCost;
  return apCost / (yieldPercent / 100);
};

/**
 * True if any ingredient in `recipe`'s cost chain — including through
 * sub-recipes — carries priceSource 'regional-estimate'. Used to flag menu
 * items whose FC% rests partly on an unverified price rather than a
 * chef-confirmed one. Mirrors recipeCost's cycle-safe recursion; a cycle
 * simply stops recursing rather than throwing, since this is an informational
 * read, not a cost total.
 */
export const recipeUsesEstimatedPricing = (
  recipe: Recipe,
  ingredients: Ingredient[],
  recipes: Recipe[],
  visited: Set<string> = new Set(),
): boolean => {
  if (visited.has(recipe.id)) return false;
  const nextVisited = new Set(visited);
  nextVisited.add(recipe.id);

  return recipe.lines.some(line => {
    if (line.type === 'ingredient') {
      const ingredient = ingredients.find(i => i.id === line.refId);
      return ingredient?.priceSource === 'regional-estimate';
    }
    const subRecipe = recipes.find(r => r.id === line.refId);
    if (!subRecipe) return false;
    return recipeUsesEstimatedPricing(subRecipe, ingredients, recipes, nextVisited);
  });
};

/** Same emerald/amber/red thresholds used everywhere FC% is displayed. */
export const fcColor = (fc: number, target: number): string =>
  fc <= target ? 'text-emerald-400' : fc <= target + 5 ? 'text-amber-400' : 'text-red-400';

/**
 * One-time snapshot for a feature created by linking to a recipe — not a
 * live join. Called once at creation; the caller stores the returned
 * values directly on the Feature doc, same shape a manual entry already
 * uses. `recipeId` is stored separately, purely as provenance.
 */
export const featureFieldsFromRecipe = (
  recipe: Recipe,
  ingredients: Ingredient[],
  recipes: Recipe[],
): { name: string; description: string; price: number | undefined; cost: number } => ({
  name: recipe.name,
  description: recipe.menuDescription ?? '',
  price: recipe.menuPrice,
  cost: Math.round(costPerPortion(recipe, ingredients, recipes) * 100) / 100,
});

/**
 * Whether `recipe` currently appears on the guest/operational menu. Only
 * `recipeType: 'menu'` recipes are ever eligible — sub-recipes have no
 * menuPrice/guest description and are never shown here. Recipes saved
 * before the `onMenu` field existed default to `true` (their prior,
 * unconditional menu status) rather than silently dropping off the menu.
 *
 * When an `activeCollection` is passed (a `RecipeCollection` with
 * `active: true`, or null when none is active), it defines the menu set:
 * the recipe must be a member AND pass its own `onMenu` toggle — the
 * toggle survives as a one-off off-switch within the season. Passing
 * null/undefined preserves the original `onMenu`-only behavior, so every
 * existing caller is unchanged.
 */
export const isRecipeOnMenu = (
  recipe: Recipe,
  activeCollection?: { recipeIds: string[] } | null,
): boolean =>
  recipe.recipeType === 'menu' &&
  (recipe.onMenu ?? true) &&
  (!activeCollection || activeCollection.recipeIds.includes(recipe.id));
