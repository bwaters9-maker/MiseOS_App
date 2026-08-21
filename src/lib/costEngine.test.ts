import { describe, it, expect } from 'vitest';
import {
  recipeCost,
  computeCostPerBaseUnit,
  costPerPortion,
  fcPercent,
  suggestedPrice,
  isRecipeOnMenu,
  recipeStatus,
  isRecipeInDevelopment,
  wouldCreateCycle,
} from './costEngine';
import type { Ingredient, Recipe, RecipeLine } from '../types';

// Fixture factories — sensible defaults, override only what a test cares
// about. Hand-computed expected values are noted inline.
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

describe('computeCostPerBaseUnit', () => {
  it('plain weight rate: cost / (qty * yield)', () => {
    // $10 / (1000g * 100%) = 0.01 / g
    expect(computeCostPerBaseUnit(10, 1000, 100)).toBeCloseTo(0.01, 10);
  });

  it('applies yield loss', () => {
    // $10 / (1000g * 50%) = 0.02 / g
    expect(computeCostPerBaseUnit(10, 1000, 50)).toBeCloseTo(0.02, 10);
  });

  it('piece-true rate when the pack divides evenly (no pack-out)', () => {
    // 1000g / 200g spec = 5 whole pieces; $20 / 5 = $4/piece; 4 / 200 = 0.02 / g
    expect(computeCostPerBaseUnit(20, 1000, 100, 200)).toBeCloseTo(0.02, 10);
  });

  it('piece-true rate charges for pack-out shortfall', () => {
    // 1000g / 300g spec = floor 3 pieces (900g used, 100g unusable pack-out);
    // $20 / 3 = $6.6667/piece; 6.6667 / 300 = 0.0222… / g
    const rate = computeCostPerBaseUnit(20, 1000, 100, 300);
    expect(rate).toBeCloseTo(0.0222222, 6);
    // Strictly dearer than the plain weight rate (0.02) — that's the pack-out premium.
    expect(rate).toBeGreaterThan(computeCostPerBaseUnit(20, 1000, 100));
  });

  it('falls back to weight rate when the spec is larger than the pack (floor 0, no divide-by-zero)', () => {
    // 100g / 300g spec = floor 0 pieces → weight rate $20 / (100 * 1) = 0.2 / g
    expect(computeCostPerBaseUnit(20, 100, 100, 300)).toBeCloseTo(0.2, 10);
  });

  it('combines piece-true costing with yield loss', () => {
    // 5 pieces, $4/piece, 4 / 200 / 0.8 = 0.025 / g
    expect(computeCostPerBaseUnit(20, 1000, 80, 200)).toBeCloseTo(0.025, 10);
  });

  it('treats pieceWeightG of 0 as absent (plain weight rate)', () => {
    expect(computeCostPerBaseUnit(10, 1000, 100, 0)).toBeCloseTo(0.01, 10);
  });

  it('returns 0 on non-positive qty or yield', () => {
    expect(computeCostPerBaseUnit(10, 0, 100)).toBe(0);
    expect(computeCostPerBaseUnit(10, 1000, 0)).toBe(0);
  });
});

describe('recipeCost', () => {
  const a = mkIng({ id: 'a', purchaseCost: 10, purchaseQty: 1000, yieldPercent: 100 }); // 0.01 / g
  const b = mkIng({ id: 'b', purchaseCost: 20, purchaseQty: 1000, yieldPercent: 100 }); // 0.02 / base

  it('sums ingredient lines at cost-per-base-unit × line qty', () => {
    // 0.01 * 500 + 0.02 * 100 = 5 + 2 = 7
    const m = mkRecipe({ id: 'm', lines: [iLine('a', 500), iLine('b', 100)] });
    expect(recipeCost(m, [a, b], [])).toBeCloseTo(7, 10);
  });

  it('skips an ingredient line whose ingredient is missing', () => {
    const m = mkRecipe({ id: 'm', lines: [iLine('a', 500), iLine('ghost', 999)] });
    expect(recipeCost(m, [a, b], [])).toBeCloseTo(5, 10);
  });

  it('recurses into a sub-recipe at its cost per base unit of batch yield', () => {
    // S batch: 0.01 * 1000 = $10 over batchYield 2000g → 0.005 / g
    // M2 line: 0.005 * 500 = 2.5
    const s = mkRecipe({ id: 's', recipeType: 'sub', batchYield: { qty: 2000, measureType: 'weight' }, lines: [iLine('a', 1000)] });
    const m2 = mkRecipe({ id: 'm2', lines: [rLine('s', 500)] });
    expect(recipeCost(m2, [a], [s])).toBeCloseTo(2.5, 10);
  });

  it('skips a sub-recipe line whose recipe is missing', () => {
    const m = mkRecipe({ id: 'm', lines: [iLine('a', 500), rLine('ghost', 999)] });
    expect(recipeCost(m, [a], [])).toBeCloseTo(5, 10);
  });

  it('contributes 0 for a sub-recipe with a zero batch yield (no divide-by-zero)', () => {
    const s0 = mkRecipe({ id: 's0', recipeType: 'sub', batchYield: { qty: 0, measureType: 'weight' }, lines: [iLine('a', 1000)] });
    const mz = mkRecipe({ id: 'mz', lines: [rLine('s0', 500)] });
    expect(recipeCost(mz, [a], [s0])).toBe(0);
  });

  it('throws on a direct self-reference', () => {
    const c = mkRecipe({ id: 'c', lines: [rLine('c', 1)] });
    expect(() => recipeCost(c, [], [c])).toThrow(/Circular reference/);
  });

  it('throws on an indirect cycle (x → y → x)', () => {
    const x = mkRecipe({ id: 'x', lines: [rLine('y', 1)] });
    const y = mkRecipe({ id: 'y', lines: [rLine('x', 1)] });
    expect(() => recipeCost(x, [], [x, y])).toThrow(/Circular reference/);
  });
});

describe('costPerPortion', () => {
  const a = mkIng({ id: 'a', purchaseCost: 10, purchaseQty: 1000, yieldPercent: 100 });
  const b = mkIng({ id: 'b', purchaseCost: 20, purchaseQty: 1000, yieldPercent: 100 });

  it('divides batch cost by portions', () => {
    // total 7 / 4 portions = 1.75
    const m = mkRecipe({ id: 'm', lines: [iLine('a', 500), iLine('b', 100)], portions: 4 });
    expect(costPerPortion(m, [a, b], [])).toBeCloseTo(1.75, 10);
  });

  it('returns the batch total when portions is 0', () => {
    const m = mkRecipe({ id: 'm', lines: [iLine('a', 500)], portions: 0 });
    expect(costPerPortion(m, [a], [])).toBeCloseTo(5, 10);
  });
});

describe('fcPercent', () => {
  it('is (cost / price) × 100', () => {
    expect(fcPercent(3, 12)).toBeCloseTo(25, 10);
  });
  it('returns 0 when price is 0', () => {
    expect(fcPercent(3, 0)).toBe(0);
  });
});

describe('suggestedPrice', () => {
  it('is cost / (targetFc / 100)', () => {
    expect(suggestedPrice(3, 30)).toBeCloseTo(10, 10);
  });
  it('returns 0 when target FC% is 0', () => {
    expect(suggestedPrice(3, 0)).toBe(0);
  });
});

describe('isRecipeOnMenu', () => {
  const menu = (over: Partial<Recipe>) => mkRecipe({ id: 'r', recipeType: 'menu', ...over });

  it('defaults a menu recipe with no onMenu field to on-menu (legacy)', () => {
    expect(isRecipeOnMenu(menu({}))).toBe(true);
  });

  it('respects an explicit onMenu toggle', () => {
    expect(isRecipeOnMenu(menu({ onMenu: true }))).toBe(true);
    expect(isRecipeOnMenu(menu({ onMenu: false }))).toBe(false);
  });

  it('is always false for a sub-recipe', () => {
    expect(isRecipeOnMenu(mkRecipe({ id: 'r', recipeType: 'sub', onMenu: true }))).toBe(false);
  });

  it('requires membership when an active collection is passed', () => {
    expect(isRecipeOnMenu(menu({ onMenu: true }), { recipeIds: ['r'] })).toBe(true);
    expect(isRecipeOnMenu(menu({ onMenu: true }), { recipeIds: ['other'] })).toBe(false);
  });

  it('lets the onMenu toggle still switch a member off within a collection', () => {
    expect(isRecipeOnMenu(menu({ onMenu: false }), { recipeIds: ['r'] })).toBe(false);
  });

  it('treats a null active collection as no collection filter', () => {
    expect(isRecipeOnMenu(menu({ onMenu: true }), null)).toBe(true);
  });

  it('excludes a development recipe regardless of its onMenu toggle', () => {
    expect(isRecipeOnMenu(menu({ status: 'development' }))).toBe(false);
    expect(isRecipeOnMenu(menu({ status: 'development', onMenu: true }))).toBe(false);
  });

  it('excludes a development recipe even when it is in the active collection', () => {
    expect(isRecipeOnMenu(menu({ status: 'development', onMenu: true }), { recipeIds: ['r'] })).toBe(false);
  });

  it('puts a recipe back on the menu when its status flips to active', () => {
    expect(isRecipeOnMenu(menu({ status: 'active', onMenu: true }))).toBe(true);
  });

  it('leaves the onMenu toggle meaningful after the status flip', () => {
    // The toggle is preserved untouched under development, so a dish that
    // was toggled off stays off once finished — the flip is not a reset.
    expect(isRecipeOnMenu(menu({ status: 'active', onMenu: false }))).toBe(false);
  });
});

describe('recipeStatus / isRecipeInDevelopment', () => {
  it('defaults a recipe with no status field to active (legacy, no migration)', () => {
    expect(recipeStatus(mkRecipe({ id: 'r' }))).toBe('active');
    expect(isRecipeInDevelopment(mkRecipe({ id: 'r' }))).toBe(false);
  });

  it('reads an explicit status', () => {
    expect(recipeStatus(mkRecipe({ id: 'r', status: 'development' }))).toBe('development');
    expect(isRecipeInDevelopment(mkRecipe({ id: 'r', status: 'development' }))).toBe(true);
    expect(isRecipeInDevelopment(mkRecipe({ id: 'r', status: 'active' }))).toBe(false);
  });
});

describe('collection membership excludes development recipes', () => {
  // Mirrors RecipeCollections.tsx's picker filter: a season's menu set is
  // built from finished dishes only.
  const collectable = (recipes: Recipe[]) =>
    recipes.filter(r => r.recipeType === 'menu' && !isRecipeInDevelopment(r)).map(r => r.id);

  it('offers active and legacy menu recipes, but not development or sub-recipes', () => {
    const recipes = [
      mkRecipe({ id: 'legacy' }),
      mkRecipe({ id: 'active', status: 'active' }),
      mkRecipe({ id: 'dev', status: 'development' }),
      mkRecipe({ id: 'sub', recipeType: 'sub' }),
    ];
    expect(collectable(recipes)).toEqual(['legacy', 'active']);
  });
});

describe('wouldCreateCycle', () => {
  it('flags a direct self-reference', () => {
    expect(wouldCreateCycle('a', 'a', [mkRecipe({ id: 'a' })])).toBe(true);
  });

  it('flags an indirect cycle where the candidate already depends on the target', () => {
    // y → z → x, so pulling y into x would close the loop x → y → z → x
    const x = mkRecipe({ id: 'x' });
    const y = mkRecipe({ id: 'y', lines: [rLine('z', 1)] });
    const z = mkRecipe({ id: 'z', lines: [rLine('x', 1)] });
    expect(wouldCreateCycle('x', 'y', [x, y, z])).toBe(true);
  });

  it('allows a legal non-cycle (candidate is an independent leaf sub-recipe)', () => {
    const m = mkRecipe({ id: 'm' });
    const s = mkRecipe({ id: 's', recipeType: 'sub', lines: [iLine('ing', 1)] });
    expect(wouldCreateCycle('m', 's', [m, s])).toBe(false);
  });

  it('agrees with the recipeCost backstop: the line it permits costs, the line it forbids throws', () => {
    const a = mkIng({ id: 'a', purchaseCost: 10, purchaseQty: 1000, yieldPercent: 100 });

    // Permitted: guard returns false, and actually building that graph costs cleanly.
    const s = mkRecipe({ id: 's', recipeType: 'sub', batchYield: { qty: 1000, measureType: 'weight' }, lines: [iLine('a', 100)] });
    const mLegal = mkRecipe({ id: 'm', lines: [rLine('s', 100)] });
    expect(wouldCreateCycle('m', 's', [mLegal, s])).toBe(false);
    expect(() => recipeCost(mLegal, [a], [s])).not.toThrow();

    // Forbidden: guard returns true, and the graph that ignoring it would build throws.
    const x = mkRecipe({ id: 'x', lines: [rLine('y', 1)] });
    const y = mkRecipe({ id: 'y', lines: [rLine('z', 1)] });
    const z = mkRecipe({ id: 'z', lines: [rLine('x', 1)] });
    expect(wouldCreateCycle('x', 'y', [x, y, z])).toBe(true);
    expect(() => recipeCost(x, [], [x, y, z])).toThrow(/Circular reference/);
  });
});
