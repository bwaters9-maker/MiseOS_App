import { describe, it, expect } from 'vitest';
import { dishDraftToRecipeDoc, resolveDraftUnit } from './dishDraftToRecipe';
import { isRecipeOnMenu, isRecipeInDevelopment } from './costEngine';
import type { DishDraft, Ingredient, Recipe } from '../types';

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

const mkDraft = (o: Partial<DishDraft> = {}): DishDraft => ({
  dishName: 'Trial Dish',
  batchYield: { qty: 1, measureType: 'weight', unit: 'kg' },
  portions: 4,
  lines: [],
  notInPantry: [],
  methodSteps: ['Sear.'],
  ...o,
});

const NOW = '2026-08-21T00:00:00.000Z';

describe('dishDraftToRecipeDoc', () => {
  it('lands a fresh extraction in development, off the menu', () => {
    const doc = dishDraftToRecipeDoc(mkDraft(), new Set(), [], 'imperial', NOW);
    expect(doc.status).toBe('development');
    expect(doc.onMenu).toBe(false);
  });

  it('keeps that extraction off the menu through isRecipeOnMenu', () => {
    const doc = dishDraftToRecipeDoc(mkDraft(), new Set(), [], 'imperial', NOW);
    const recipe: Recipe = { id: 'new', ...doc };
    expect(isRecipeInDevelopment(recipe)).toBe(true);
    expect(isRecipeOnMenu(recipe)).toBe(false);
    // …and still off even if the chef flips only the onMenu toggle — the
    // status flip is what finishes a dish.
    expect(isRecipeOnMenu({ ...recipe, onMenu: true })).toBe(false);
    expect(isRecipeOnMenu({ ...recipe, status: 'active', onMenu: true })).toBe(true);
  });

  it('creates a menu recipe carrying the draft name, portions, and method', () => {
    const doc = dishDraftToRecipeDoc(mkDraft({ dishName: '  Trial Dish  ' }), new Set(), [], 'imperial', NOW);
    expect(doc.recipeType).toBe('menu');
    expect(doc.name).toBe('Trial Dish');
    expect(doc.portions).toBe(4);
    expect(doc.methodSteps).toEqual(['Sear.']);
    expect(doc.updatedAt).toBe(NOW);
  });

  it('includes only kept lines, converted to canonical base units', () => {
    const draft = mkDraft({
      lines: [
        { ingredientId: 'beef', name: 'beef', qty: 500, unit: 'g' },
        { ingredientId: 'salt', name: 'salt', qty: 10, unit: 'g' },
      ],
    });
    const ingredients = [mkIng({ id: 'beef' }), mkIng({ id: 'salt' })];
    const doc = dishDraftToRecipeDoc(draft, new Set([0]), ingredients, 'metric', NOW);
    expect(doc.lines).toEqual([{ type: 'ingredient', refId: 'beef', qty: 500 }]);
  });

  it('throws rather than guessing when the draft has no batch yield', () => {
    expect(() => dishDraftToRecipeDoc(mkDraft({ batchYield: null }), new Set(), [], 'imperial', NOW))
      .toThrow(/batch yield/i);
  });
});

describe('resolveDraftUnit', () => {
  it('keeps a unit that is valid for its measure type', () => {
    expect(resolveDraftUnit('g', 'weight', 'metric')).toBe('g');
  });

  it('falls back to the system default for a unit the model made up', () => {
    expect(resolveDraftUnit('smidgen', 'weight', 'metric'))
      .toBe(resolveDraftUnit('', 'weight', 'metric'));
  });
});
