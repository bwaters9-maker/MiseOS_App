/**
 * src/lib/dishDraftToRecipe.ts
 * Pure conversion from a Test Kitchen `DishDraft` (client-only, pulled
 * from a Sous conversation) to the `recipes` document the Recipe Build
 * panel writes. Extracted from DishBuildPanel.tsx so the hand-off's
 * defaults — development status, off-menu, unit resolution, kept-lines
 * only — are testable without mounting the component or touching
 * Firestore. The panel owns the write and the navigation; this owns the
 * shape.
 */
import { toBase, displayUnitsFor, defaultDisplayUnit, type UnitSystem, type DisplayUnit } from './units';
import type { DishDraft, Ingredient, MeasureType, Recipe, RecipeLine } from '../types';

/**
 * Resolves an AI-returned display unit against what's actually valid for
 * a measure type, falling back to the system default when it doesn't
 * match — the same defensive pattern Recipes.tsx's acceptSuggestion uses
 * for pantry-suggestion units.
 */
export const resolveDraftUnit = (
  aiUnit: string,
  measureType: MeasureType,
  unitSystem: UnitSystem,
): DisplayUnit => {
  const validUnits = displayUnitsFor(measureType, unitSystem) as string[];
  return (validUnits.includes(aiUnit) ? aiUnit : defaultDisplayUnit(measureType, unitSystem)) as DisplayUnit;
};

/**
 * Builds the recipe document for a hand-off. `keptLines` holds the draft
 * line indices the chef kept; discarded lines are excluded here and never
 * removed from the draft itself, so a discard stays reversible until the
 * write happens.
 *
 * Callers must have confirmed dish name, batch yield, and portions are
 * present (`canHandOff` in the panel) — this asserts that rather than
 * guessing values.
 */
export const dishDraftToRecipeDoc = (
  draft: DishDraft,
  keptLines: Set<number>,
  ingredients: Ingredient[],
  unitSystem: UnitSystem,
  now: string,
): Omit<Recipe, 'id'> => {
  if (!draft.batchYield || draft.portions == null) {
    throw new Error('Dish draft is missing a batch yield or portion count.');
  }
  const yieldUnit = resolveDraftUnit(draft.batchYield.unit, draft.batchYield.measureType, unitSystem);
  const lines: RecipeLine[] = draft.lines
    .filter((_, i) => keptLines.has(i))
    .map((line): RecipeLine => {
      const ing = ingredients.find(i => i.id === line.ingredientId);
      const unit = ing ? resolveDraftUnit(line.unit, ing.measureType, unitSystem) : ('each' as DisplayUnit);
      return {
        type: 'ingredient',
        refId: line.ingredientId!,
        qty: toBase(line.qty, unit),
        ...(line.note && { note: line.note }),
      };
    });

  return {
    name: draft.dishName.trim(),
    recipeType: 'menu',
    course: '',
    batchYield: { qty: toBase(draft.batchYield.qty, yieldUnit), measureType: draft.batchYield.measureType },
    portions: draft.portions,
    lines,
    methodSteps: draft.methodSteps,
    // A freshly extracted dish is not on the menu until the chef puts it
    // there deliberately from the Recipes library. Explicit false rather
    // than relying on isRecipeOnMenu's `?? true` legacy default, which
    // stays untouched so existing recipes keep their current behavior.
    onMenu: false,
    // Extractions land in development: the dish came out of a chat, not out
    // of service. It stays off the Menu, out of Collections, and out of the
    // Guest Preview until the chef flips it active from the Recipe Builder.
    // Both this and onMenu: false are set — status governs visibility now,
    // onMenu keeps its meaning for after the flip.
    status: 'development',
    updatedAt: now,
  };
};
