/**
 * src/lib/costEngine.ts
 * Recipe and ingredient cost calculations. Pure functions, no React.
 */

import { Recipe, Ingredient, RecipeStatus } from '../types';

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

export type FcState = 'under' | 'borderline' | 'over';

export interface FcIndicator {
  state: FcState;
  textClass: string;
  weightClass: string;
  /** Empty string for 'under' — the leading glyph column stays reserved but blank. */
  glyph: string;
  /** fc - target. Only meaningful, and only ever rendered, for 'borderline'/'over'. */
  delta: number;
}

/**
 * Render spec for an already-classified food-cost state. Colour is never the
 * only signal (P-028): AA on cream caps every text colour at relative
 * luminance <= 0.1498, so a hue ladder and a lightness ladder can't coexist
 * in that band — and the obvious hue ladder (teal/saffron/danger) is
 * non-monotonic anyway (teal L=0.155, saffron L=0.430, danger L=0.143: good
 * and over-target land at the SAME lightness, borderline is the lightest).
 * Mark only the exception instead: navy stays navy through 'under' and
 * 'borderline', weight and a leading glyph carry the escalation, and only
 * 'over' spends the one colour change the eye needs.
 */
export const fcIndicatorFor = (state: FcState, delta: number): FcIndicator => {
  if (state === 'under') return { state, textClass: 'text-navy', weightClass: 'font-normal', glyph: '', delta };
  if (state === 'borderline') return { state, textClass: 'text-navy', weightClass: 'font-medium', glyph: '●', delta };
  return { state, textClass: 'text-danger', weightClass: 'font-bold', glyph: '▲', delta };
};

/** The standard target/target+5 classification, for every screen that reads
 * the restaurant's configured targetFcPercent (ChefDashboard, Menu, the
 * Recipe Builder). Replaces the old emerald/amber/red `fcColor`. */
export const fcIndicator = (fc: number, target: number): FcIndicator => {
  const delta = fc - target;
  const state: FcState = fc <= target ? 'under' : fc <= target + 5 ? 'borderline' : 'over';
  return fcIndicatorFor(state, delta);
};

/**
 * Legacy fixed 28%/34% thresholds. Features.tsx and DailyCribSheet.tsx each
 * hand-copied an identical `fc<28/fc<34` classifier, unrelated to the
 * restaurant's configurable targetFcPercent that every other FC% display
 * reads — the same feature can read "under" on one screen and "over" on
 * another. Consolidated to one implementation for the P-028 indicator
 * redesign; the 28/34 values themselves are UNCHANGED and their divergence
 * from the real target is a pre-existing bug, reported separately, not
 * fixed here.
 */
export const fcIndicatorLegacyFixed = (fc: number): FcIndicator =>
  fcIndicatorFor(fc < 28 ? 'under' : fc < 34 ? 'borderline' : 'over', fc - 28);

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
 * A recipe still in development is never on the menu, whatever its
 * `onMenu` toggle says — finishing the dish is the status flip, and the
 * toggle is preserved untouched underneath so it still means what it
 * meant once the recipe goes active.
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
  !isRecipeInDevelopment(recipe) &&
  (recipe.onMenu ?? true) &&
  (!activeCollection || activeCollection.recipeIds.includes(recipe.id));

/**
 * A recipe's lifecycle status, with the legacy default applied. Recipes
 * saved before `status` existed have no field and read as 'active' —
 * their prior behavior — so no migration write was ever needed.
 */
export const recipeStatus = (recipe: Pick<Recipe, 'status'>): RecipeStatus =>
  recipe.status ?? 'active';

/** Whether this recipe is still being developed (see `recipeStatus`). */
export const isRecipeInDevelopment = (recipe: Pick<Recipe, 'status'>): boolean =>
  recipeStatus(recipe) === 'development';
