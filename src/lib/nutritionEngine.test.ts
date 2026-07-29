import { describe, it, expect } from 'vitest';
import { recipeNutrition, nutritionPerPortion } from './nutritionEngine';
import type { Ingredient, Recipe, RecipeLine, NutritionPer100g, Allergen } from '../types';

// Fixture factories. This module takes id-keyed maps (not arrays like
// costEngine), so `byId` builds the lookup objects. Expected values are
// hand-computed and noted inline.
const mkIng = (o: Partial<Ingredient> & { id: string }): Ingredient => ({
  name: o.id,
  category: 'Protein',
  measureType: 'weight',
  purchaseUnit: 'unit',
  purchaseCost: 0,
  purchaseQty: 1,
  yieldPercent: 100,
  lastVerified: '',
  priceSource: 'manual',
  ...o,
});

const mkRecipe = (o: Partial<Recipe> & { id: string }): Recipe => ({
  name: o.id,
  recipeType: 'menu',
  course: '',
  batchYield: { qty: 1, measureType: 'weight' },
  portions: 1,
  lines: [],
  methodSteps: [],
  updatedAt: '',
  ...o,
});

const iLine = (refId: string, qty: number): RecipeLine => ({ type: 'ingredient', refId, qty });
const rLine = (refId: string, qty: number): RecipeLine => ({ type: 'recipe', refId, qty });

const byId = <T extends { id: string }>(items: T[]): Record<string, T> =>
  items.reduce((m, it) => { m[it.id] = it; return m; }, {} as Record<string, T>);

const n = (o: Partial<NutritionPer100g>): NutritionPer100g => o;
const sorted = (a: Allergen[]): Allergen[] => [...a].sort();

describe('recipeNutrition — per-100g weight scaling', () => {
  it('scales each nutrient by grams / 100', () => {
    // 250g of {200 cal, 10g protein}/100g → ×2.5 → 500 cal, 25g protein
    const ing = mkIng({ id: 'a', nutritionPer100g: n({ calories: 200, protein: 10 }) });
    const m = mkRecipe({ id: 'm', lines: [iLine('a', 250)] });
    const res = recipeNutrition(m, byId([m]), byId([ing]));
    expect(res.totals.calories).toBeCloseTo(500, 10);
    expect(res.totals.protein).toBeCloseTo(25, 10);
    expect(res.totals.totalFat).toBe(0);
    expect(res.completeness.isComplete).toBe(true);
    expect(res.completeness.flags).toEqual([]);
    expect(res.allergens).toEqual([]);
  });

  it('PARKED DESIGN GAP: a partial nutrition object silently contributes 0 for absent nutrients and is NOT flagged incomplete', () => {
    // Only calories present. Protein/fat absent → contribute 0, yet the label
    // reports isComplete. Documented today; flagged for a design ruling, not fixed.
    const ing = mkIng({ id: 'p', nutritionPer100g: n({ calories: 100 }) });
    const m = mkRecipe({ id: 'm', lines: [iLine('p', 100)] });
    const res = recipeNutrition(m, byId([m]), byId([ing]));
    expect(res.totals.calories).toBeCloseTo(100, 10);
    expect(res.totals.protein).toBe(0);
    expect(res.totals.totalFat).toBe(0);
    expect(res.completeness.flags).toEqual([]);
    expect(res.completeness.isComplete).toBe(true);
  });
});

describe('recipeNutrition — each measure type', () => {
  it('converts pieces to grams via pieceWeightG', () => {
    // 3 pieces × 50g = 150g of {200 cal}/100g → ×1.5 → 300 cal
    const ing = mkIng({ id: 'e', measureType: 'each', pieceWeightG: 50, nutritionPer100g: n({ calories: 200 }) });
    const m = mkRecipe({ id: 'm', lines: [iLine('e', 3)] });
    const res = recipeNutrition(m, byId([m]), byId([ing]));
    expect(res.totals.calories).toBeCloseTo(300, 10);
    expect(res.completeness.isComplete).toBe(true);
  });

  it('flags and skips an each ingredient with no pieceWeightG (cannot convert to grams)', () => {
    const ing = mkIng({ id: 'e', measureType: 'each', nutritionPer100g: n({ calories: 200 }) });
    const m = mkRecipe({ id: 'm', lines: [iLine('e', 3)] });
    const res = recipeNutrition(m, byId([m]), byId([ing]));
    expect(res.totals.calories).toBe(0);
    expect(res.completeness.flags).toContainEqual({ refId: 'e', type: 'ingredient', reason: 'missing-piece-weight', skipped: true });
    expect(res.completeness.hasSkippedLines).toBe(true);
    expect(res.completeness.isComplete).toBe(false);
  });

  it('treats pieceWeightG of 0 as missing (same skip path, no divide-by-zero)', () => {
    const ing = mkIng({ id: 'e', measureType: 'each', pieceWeightG: 0, nutritionPer100g: n({ calories: 200 }) });
    const m = mkRecipe({ id: 'm', lines: [iLine('e', 3)] });
    const res = recipeNutrition(m, byId([m]), byId([ing]));
    expect(res.totals.calories).toBe(0);
    expect(res.completeness.flags).toContainEqual({ refId: 'e', type: 'ingredient', reason: 'missing-piece-weight', skipped: true });
  });
});

describe('recipeNutrition — volume approximation', () => {
  it('contributes the line but discloses the ml→g 1:1 approximation (not skipped)', () => {
    // 200ml approximated as 200g of {100 cal}/100g → ×2 → 200 cal, and flagged
    const ing = mkIng({ id: 'v', measureType: 'volume', nutritionPer100g: n({ calories: 100 }) });
    const m = mkRecipe({ id: 'm', lines: [iLine('v', 200)] });
    const res = recipeNutrition(m, byId([m]), byId([ing]));
    expect(res.totals.calories).toBeCloseTo(200, 10);
    expect(res.completeness.flags).toContainEqual({ refId: 'v', type: 'ingredient', reason: 'volume-approximated', skipped: false });
    expect(res.completeness.hasVolumeApproximation).toBe(true);
    expect(res.completeness.hasSkippedLines).toBe(false);
    expect(res.completeness.isComplete).toBe(false);
  });
});

describe('recipeNutrition — missing / not-found lines', () => {
  it('flags and skips an ingredient with no nutrition data', () => {
    const ing = mkIng({ id: 'f', nutritionPer100g: undefined });
    const m = mkRecipe({ id: 'm', lines: [iLine('f', 100)] });
    const res = recipeNutrition(m, byId([m]), byId([ing]));
    expect(res.totals.calories).toBe(0);
    expect(res.completeness.flags).toContainEqual({ refId: 'f', type: 'ingredient', reason: 'missing-nutrition-data', skipped: true });
    expect(res.completeness.isComplete).toBe(false);
  });

  it('flags an ingredient that is not in the pantry map', () => {
    const m = mkRecipe({ id: 'm', lines: [iLine('ghost', 100)] });
    const res = recipeNutrition(m, byId([m]), byId([]));
    expect(res.totals.calories).toBe(0);
    expect(res.allergens).toEqual([]);
    expect(res.completeness.flags).toContainEqual({ refId: 'ghost', type: 'ingredient', reason: 'ingredient-not-found', skipped: true });
  });
});

// Safety-critical: an ingredient with unknown nutrition still has KNOWN
// allergens. Dropping them because calories are missing would be the worst
// failure of this module — allergen data must never be lost to incomplete
// nutrition data.
describe('recipeNutrition — allergens must survive skipped lines', () => {
  it('keeps allergens from a line skipped for missing nutrition data', () => {
    const ing = mkIng({ id: 'f', nutritionPer100g: undefined, allergens: ['soybeans'] });
    const m = mkRecipe({ id: 'm', lines: [iLine('f', 100)] });
    const res = recipeNutrition(m, byId([m]), byId([ing]));
    expect(res.completeness.hasSkippedLines).toBe(true); // the line contributed no nutrition
    expect(res.allergens).toEqual(['soybeans']);          // …but its allergen is retained
  });

  it('keeps allergens from an each line skipped for missing piece weight', () => {
    const ing = mkIng({ id: 'e', measureType: 'each', nutritionPer100g: n({ calories: 200 }), allergens: ['peanuts'] });
    const m = mkRecipe({ id: 'm', lines: [iLine('e', 3)] });
    const res = recipeNutrition(m, byId([m]), byId([ing]));
    expect(res.completeness.hasSkippedLines).toBe(true);
    expect(res.totals.calories).toBe(0);
    expect(res.allergens).toEqual(['peanuts']);
  });
});

describe('recipeNutrition — AI-estimated data flag', () => {
  it('is true when a contributing ingredient is AI-sourced', () => {
    const ing = mkIng({ id: 'a', nutritionPer100g: n({ calories: 100 }), nutritionSource: 'ai' });
    const m = mkRecipe({ id: 'm', lines: [iLine('a', 100)] });
    const res = recipeNutrition(m, byId([m]), byId([ing]));
    expect(res.completeness.containsAiEstimatedData).toBe(true);
  });

  it('is false when the contributing data is chef-verified (manual)', () => {
    const ing = mkIng({ id: 'a', nutritionPer100g: n({ calories: 100 }), nutritionSource: 'manual' });
    const m = mkRecipe({ id: 'm', lines: [iLine('a', 100)] });
    const res = recipeNutrition(m, byId([m]), byId([ing]));
    expect(res.completeness.containsAiEstimatedData).toBe(false);
  });

  it('is false for an AI-sourced ingredient that was skipped (it never contributed)', () => {
    const ing = mkIng({ id: 'a', nutritionPer100g: undefined, nutritionSource: 'ai' });
    const m = mkRecipe({ id: 'm', lines: [iLine('a', 100)] });
    const res = recipeNutrition(m, byId([m]), byId([ing]));
    expect(res.completeness.containsAiEstimatedData).toBe(false);
  });
});

describe('recipeNutrition — sub-recipe recursion', () => {
  it('scales a sub-recipe by line qty / sub batch yield', () => {
    // sub batch: 500g of {400 cal}/100g → 2000 cal over batchYield 1000g.
    // parent pulls 250g → factor 0.25 → 500 cal
    const ingA = mkIng({ id: 'a', nutritionPer100g: n({ calories: 400 }), allergens: ['milk'] });
    const sub = mkRecipe({ id: 's', recipeType: 'sub', batchYield: { qty: 1000, measureType: 'weight' }, lines: [iLine('a', 500)] });
    const m = mkRecipe({ id: 'm', lines: [rLine('s', 250)] });
    const res = recipeNutrition(m, byId([m, sub]), byId([ingA]));
    expect(res.totals.calories).toBeCloseTo(500, 10);
    expect(res.allergens).toEqual(['milk']); // allergens bubble up from the sub
    expect(res.completeness.isComplete).toBe(true);
  });

  it('propagates a sub-recipe flag up to the parent completeness report', () => {
    const bad = mkIng({ id: 'b', nutritionPer100g: undefined });
    const sub = mkRecipe({ id: 's', recipeType: 'sub', batchYield: { qty: 1000, measureType: 'weight' }, lines: [iLine('b', 500)] });
    const m = mkRecipe({ id: 'm', lines: [rLine('s', 250)] });
    const res = recipeNutrition(m, byId([m, sub]), byId([bad]));
    expect(res.completeness.hasSkippedLines).toBe(true);
    expect(res.completeness.flags).toContainEqual({ refId: 'b', type: 'ingredient', reason: 'missing-nutrition-data', skipped: true });
  });

  it('flags a sub-recipe that is not in the recipe map', () => {
    const m = mkRecipe({ id: 'm', lines: [rLine('ghostSub', 100)] });
    const res = recipeNutrition(m, byId([m]), byId([]));
    expect(res.totals.calories).toBe(0);
    expect(res.completeness.flags).toContainEqual({ refId: 'ghostSub', type: 'recipe', reason: 'sub-recipe-not-found', skipped: true });
  });

  it('contributes 0 for a zero-batch-yield sub-recipe and emits NO flag for it (matches costEngine)', () => {
    // Documents today's behavior: a zero-yield sub silently drops to 0 with no
    // dedicated flag; only its own internal line flags (none here) propagate.
    const ingA = mkIng({ id: 'a', nutritionPer100g: n({ calories: 400 }) });
    const sub0 = mkRecipe({ id: 's0', recipeType: 'sub', batchYield: { qty: 0, measureType: 'weight' }, lines: [iLine('a', 500)] });
    const m = mkRecipe({ id: 'm', lines: [rLine('s0', 250)] });
    const res = recipeNutrition(m, byId([m, sub0]), byId([ingA]));
    expect(res.totals.calories).toBe(0);
    expect(res.completeness.flags).toEqual([]);
    expect(res.completeness.isComplete).toBe(true);
  });

  it('throws on a direct self-reference', () => {
    const c = mkRecipe({ id: 'c', lines: [rLine('c', 1)] });
    expect(() => recipeNutrition(c, byId([c]), byId([]))).toThrow(/Circular reference/);
  });

  it('throws on an indirect cycle (x → y → x)', () => {
    const x = mkRecipe({ id: 'x', lines: [rLine('y', 1)] });
    const y = mkRecipe({ id: 'y', lines: [rLine('x', 1)] });
    expect(() => recipeNutrition(x, byId([x, y]), byId([]))).toThrow(/Circular reference/);
  });
});

describe('nutritionPerPortion', () => {
  it('divides totals across portions but leaves allergens and completeness per-batch', () => {
    // batch 500 cal / 4 portions = 125 cal; allergens + completeness unchanged
    const ing = mkIng({ id: 'a', nutritionPer100g: n({ calories: 200 }), allergens: ['milk'] });
    const m = mkRecipe({ id: 'm', lines: [iLine('a', 250)], portions: 4 });
    const maps: [Record<string, Recipe>, Record<string, Ingredient>] = [byId([m]), byId([ing])];
    const batch = recipeNutrition(m, ...maps);
    const per = nutritionPerPortion(m, ...maps);
    expect(per.totals.calories).toBeCloseTo(125, 10);
    expect(per.allergens).toEqual(batch.allergens);
    expect(per.completeness).toEqual(batch.completeness);
  });

  it('returns batch totals unchanged when portions is 0 (no divide-by-zero)', () => {
    const ing = mkIng({ id: 'a', nutritionPer100g: n({ calories: 200 }) });
    const m = mkRecipe({ id: 'm', lines: [iLine('a', 250)], portions: 0 });
    const maps: [Record<string, Recipe>, Record<string, Ingredient>] = [byId([m]), byId([ing])];
    const batch = recipeNutrition(m, ...maps);
    const per = nutritionPerPortion(m, ...maps);
    expect(per.totals.calories).toBeCloseTo(batch.totals.calories, 10);
  });
});

describe('allergen aggregation', () => {
  it('dedupes allergens across ingredients and sub-recipes', () => {
    const l1 = mkIng({ id: 'l1', nutritionPer100g: n({ calories: 1 }), allergens: ['milk', 'eggs'] });
    const l2 = mkIng({ id: 'l2', nutritionPer100g: n({ calories: 1 }), allergens: ['milk'] }); // milk overlaps l1
    const l3 = mkIng({ id: 'l3', nutritionPer100g: n({ calories: 1 }), allergens: ['soybeans'] });
    const sub = mkRecipe({ id: 's', recipeType: 'sub', batchYield: { qty: 100, measureType: 'weight' }, lines: [iLine('l3', 100)] });
    const m = mkRecipe({ id: 'm', lines: [iLine('l1', 100), iLine('l2', 100), rLine('s', 100)] });
    const res = recipeNutrition(m, byId([m, sub]), byId([l1, l2, l3]));
    expect(sorted(res.allergens)).toEqual(['eggs', 'milk', 'soybeans']);
  });

  it('is an empty array when no ingredient carries an allergen', () => {
    const ing = mkIng({ id: 'a', nutritionPer100g: n({ calories: 100 }) });
    const m = mkRecipe({ id: 'm', lines: [iLine('a', 100)] });
    const res = recipeNutrition(m, byId([m]), byId([ing]));
    expect(res.allergens).toEqual([]);
  });
});
