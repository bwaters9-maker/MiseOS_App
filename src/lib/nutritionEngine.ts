/**
 * src/lib/nutritionEngine.ts
 * FDA Nutrition Label calculation engine. Pure functions, no React, no
 * Firestore access — mirrors costEngine.ts's conventions (cycle-safe
 * recursion through sub-recipes, per-base-unit scaling).
 *
 * Rendering, FDA rounding rules, and Recipe Builder UI are a later pass.
 * This file only aggregates numbers and reports what's missing.
 */

import { Recipe, Ingredient, NutritionPer100g, Allergen } from '../types';

const NUTRITION_KEYS: (keyof NutritionPer100g)[] = [
  'calories', 'totalFat', 'saturatedFat', 'transFat', 'cholesterol', 'sodium',
  'totalCarbs', 'fiber', 'sugars', 'addedSugars', 'protein',
];

export type NutritionTotals = { [K in keyof NutritionPer100g]-?: number };

const zeroTotals = (): NutritionTotals =>
  NUTRITION_KEYS.reduce((acc, k) => { acc[k] = 0; return acc; }, {} as NutritionTotals);

const addTotals = (a: NutritionTotals, b: NutritionTotals): NutritionTotals => {
  const result = zeroTotals();
  NUTRITION_KEYS.forEach(k => { result[k] = a[k] + b[k]; });
  return result;
};

const scaleTotals = (t: NutritionTotals, factor: number): NutritionTotals => {
  const result = zeroTotals();
  NUTRITION_KEYS.forEach(k => { result[k] = t[k] * factor; });
  return result;
};

const scaleNutrition = (n: NutritionPer100g, factor: number): NutritionTotals => {
  const result = zeroTotals();
  NUTRITION_KEYS.forEach(k => {
    const v = n[k];
    if (v != null) result[k] = v * factor;
  });
  return result;
};

/**
 * One line of the completeness report. `skipped: true` means the line
 * contributed nothing to the totals; `skipped: false` (currently only
 * 'volume-approximated') means it contributed using an approximation that
 * the label UI must disclose.
 */
export interface NutritionFlag {
  refId: string;
  type: 'ingredient' | 'recipe';
  reason: 'missing-nutrition-data' | 'missing-piece-weight' | 'volume-approximated' | 'ingredient-not-found' | 'sub-recipe-not-found';
  skipped: boolean;
}

export interface NutritionCompletenessReport {
  flags: NutritionFlag[];
  hasSkippedLines: boolean;
  hasVolumeApproximation: boolean;
  /** Any contributing ingredient (including through sub-recipes) carries nutritionSource: 'ai'. */
  containsAiEstimatedData: boolean;
  /** False if anything was skipped or approximated — the label must not be presented as authoritative. */
  isComplete: boolean;
}

export interface NutritionResult {
  totals: NutritionTotals;
  allergens: Allergen[];
  completeness: NutritionCompletenessReport;
}

interface NutritionAccumulation {
  totals: NutritionTotals;
  allergens: Set<Allergen>;
  flags: NutritionFlag[];
  usesAiData: boolean;
}

/**
 * Recurses through `recipe`'s lines, summing nutrition contributions.
 * `visited` tracks the ancestor chain so a cycle throws the same
 * descriptive error as costEngine.recipeCost, instead of recursing forever.
 */
const accumulateRecipeNutrition = (
  recipe: Recipe,
  recipesById: Record<string, Recipe>,
  ingredientsById: Record<string, Ingredient>,
  visited: Set<string>,
): NutritionAccumulation => {
  if (visited.has(recipe.id)) {
    throw new Error(`Circular reference detected: "${recipe.name}" includes itself as a sub-recipe, directly or through another recipe.`);
  }
  const nextVisited = new Set(visited);
  nextVisited.add(recipe.id);

  let totals = zeroTotals();
  const allergens = new Set<Allergen>();
  const flags: NutritionFlag[] = [];
  let usesAiData = false;

  for (const line of recipe.lines) {
    if (line.type === 'ingredient') {
      const ingredient = ingredientsById[line.refId];
      if (!ingredient) {
        flags.push({ refId: line.refId, type: 'ingredient', reason: 'ingredient-not-found', skipped: true });
        continue;
      }
      (ingredient.allergens ?? []).forEach(a => allergens.add(a));

      let grams: number;
      if (ingredient.measureType === 'each') {
        if (ingredient.pieceWeightG == null || ingredient.pieceWeightG <= 0) {
          flags.push({ refId: line.refId, type: 'ingredient', reason: 'missing-piece-weight', skipped: true });
          continue;
        }
        grams = line.qty * ingredient.pieceWeightG;
      } else {
        // weight is already grams; volume (ml) is approximated 1:1 as grams below.
        grams = line.qty;
      }

      if (!ingredient.nutritionPer100g) {
        flags.push({ refId: line.refId, type: 'ingredient', reason: 'missing-nutrition-data', skipped: true });
        continue;
      }

      if (ingredient.measureType === 'volume') {
        flags.push({ refId: line.refId, type: 'ingredient', reason: 'volume-approximated', skipped: false });
      }

      totals = addTotals(totals, scaleNutrition(ingredient.nutritionPer100g, grams / 100));
      if (ingredient.nutritionSource === 'ai') usesAiData = true;
    } else {
      const subRecipe = recipesById[line.refId];
      if (!subRecipe) {
        flags.push({ refId: line.refId, type: 'recipe', reason: 'sub-recipe-not-found', skipped: true });
        continue;
      }
      const sub = accumulateRecipeNutrition(subRecipe, recipesById, ingredientsById, nextVisited);
      const factor = subRecipe.batchYield.qty > 0 ? line.qty / subRecipe.batchYield.qty : 0;
      totals = addTotals(totals, scaleTotals(sub.totals, factor));
      sub.allergens.forEach(a => allergens.add(a));
      flags.push(...sub.flags);
      if (sub.usesAiData) usesAiData = true;
    }
  }

  return { totals, allergens, flags, usesAiData };
};

const toResult = (acc: NutritionAccumulation): NutritionResult => {
  const hasSkippedLines = acc.flags.some(f => f.skipped);
  const hasVolumeApproximation = acc.flags.some(f => f.reason === 'volume-approximated');
  return {
    totals: acc.totals,
    allergens: Array.from(acc.allergens),
    completeness: {
      flags: acc.flags,
      hasSkippedLines,
      hasVolumeApproximation,
      containsAiEstimatedData: acc.usesAiData,
      isComplete: !hasSkippedLines && !hasVolumeApproximation,
    },
  };
};

/** Total nutrition for one batch of `recipe`, recursing through sub-recipe lines. */
export const recipeNutrition = (
  recipe: Recipe,
  recipesById: Record<string, Recipe>,
  ingredientsById: Record<string, Ingredient>,
): NutritionResult => toResult(accumulateRecipeNutrition(recipe, recipesById, ingredientsById, new Set()));

/** Batch nutrition divided across `recipe.portions`. Allergens and completeness are per-batch facts, unaffected by portioning. */
export const nutritionPerPortion = (
  recipe: Recipe,
  recipesById: Record<string, Recipe>,
  ingredientsById: Record<string, Ingredient>,
): NutritionResult => {
  const batch = recipeNutrition(recipe, recipesById, ingredientsById);
  const factor = recipe.portions > 0 ? 1 / recipe.portions : 1;
  return { ...batch, totals: scaleTotals(batch.totals, factor) };
};
