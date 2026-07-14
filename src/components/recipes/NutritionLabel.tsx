import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { nutritionPerPortion, NutritionFlag } from '../../lib/nutritionEngine';
import {
  roundCalories, roundFatGrams, roundTransFatGrams, roundCholesterolMg, roundSodiumMg,
  roundCarbGrams, roundProteinGrams, percentDV, RoundedAmount, DailyValueKey,
} from '../../lib/fdaRounding';
import type { Recipe, Ingredient, NutritionPer100g, Allergen } from '../../types';

/**
 * FALCPA major allergens only — the regulatory "Contains:" line may never
 * include anything outside this set.
 */
const BIG_9: Allergen[] = ['milk', 'eggs', 'fish', 'shellfish', 'treeNuts', 'peanuts', 'wheat', 'soybeans', 'sesame'];

/**
 * The full canonical Allergen union (src/types.ts) — Big-9 plus gluten and
 * sulfites, which are tracked app-wide but are not FALCPA major allergens.
 * Some Firestore ingredient docs predate the structured allergen chip UI and
 * carry off-list values entirely — those must never reach the label silently.
 */
const CANONICAL_ALLERGENS: Allergen[] = [...BIG_9, 'gluten', 'sulfites'];

const NUTRIENT_FIELDS: (keyof NutritionPer100g)[] = [
  'calories', 'totalFat', 'saturatedFat', 'transFat', 'cholesterol', 'sodium',
  'totalCarbs', 'fiber', 'sugars', 'addedSugars', 'protein',
];

/**
 * Which nutrient fields at least one contributing ingredient (recursed
 * through sub-recipes) actually specified. A field absent everywhere renders
 * "—" on the label rather than a false "0" — nutritionEngine's totals can't
 * distinguish "verified zero" from "nobody entered this field".
 */
const collectFieldPresence = (
  recipe: Recipe,
  recipesById: Record<string, Recipe>,
  ingredientsById: Record<string, Ingredient>,
  visited: Set<string> = new Set(),
): Set<keyof NutritionPer100g> => {
  if (visited.has(recipe.id)) return new Set();
  const nextVisited = new Set(visited);
  nextVisited.add(recipe.id);

  const present = new Set<keyof NutritionPer100g>();
  recipe.lines.forEach(line => {
    if (line.type === 'ingredient') {
      const ingredient = ingredientsById[line.refId];
      if (!ingredient?.nutritionPer100g) return;
      NUTRIENT_FIELDS.forEach(k => {
        if (ingredient.nutritionPer100g![k] != null) present.add(k);
      });
    } else {
      const subRecipe = recipesById[line.refId];
      if (!subRecipe) return;
      collectFieldPresence(subRecipe, recipesById, ingredientsById, nextVisited).forEach(k => present.add(k));
    }
  });
  return present;
};

const flagReasonLabel = (reason: NutritionFlag['reason']): string => {
  switch (reason) {
    case 'missing-nutrition-data': return 'no nutrition data on file';
    case 'missing-piece-weight': return 'counted by piece with no piece weight set';
    case 'ingredient-not-found': return 'ingredient no longer in the Master Pantry';
    case 'sub-recipe-not-found': return 'sub-recipe no longer exists';
    case 'volume-approximated': return 'volume approximated as weight';
  }
};

const formatExact = (value: number, unit: string): string => `${value}${unit}`;
const formatAmount = (r: RoundedAmount, unit: string): string =>
  r.kind === 'lessThan' ? `Less than ${r.value}${unit}` : formatExact(r.value, unit);

interface NutrientRow {
  key: keyof NutritionPer100g;
  label: string;
  indent: 0 | 1 | 2;
  unit: 'g' | 'mg';
  dvKey?: DailyValueKey;
}

const ROWS: NutrientRow[] = [
  { key: 'totalFat', label: 'Total Fat', indent: 0, unit: 'g', dvKey: 'totalFat' },
  { key: 'saturatedFat', label: 'Saturated Fat', indent: 1, unit: 'g', dvKey: 'saturatedFat' },
  { key: 'transFat', label: 'Trans Fat', indent: 1, unit: 'g' },
  { key: 'cholesterol', label: 'Cholesterol', indent: 0, unit: 'mg', dvKey: 'cholesterol' },
  { key: 'sodium', label: 'Sodium', indent: 0, unit: 'mg', dvKey: 'sodium' },
  { key: 'totalCarbs', label: 'Total Carbohydrate', indent: 0, unit: 'g', dvKey: 'totalCarbs' },
  { key: 'fiber', label: 'Dietary Fiber', indent: 1, unit: 'g', dvKey: 'fiber' },
  { key: 'sugars', label: 'Total Sugars', indent: 1, unit: 'g' },
  { key: 'addedSugars', label: 'Includes Added Sugars', indent: 2, unit: 'g', dvKey: 'addedSugars' },
  { key: 'protein', label: 'Protein', indent: 0, unit: 'g' },
];

const roundRow = (key: keyof NutritionPer100g, raw: number): RoundedAmount => {
  switch (key) {
    case 'totalFat':
    case 'saturatedFat':
      return { kind: 'exact', value: roundFatGrams(raw) };
    case 'transFat':
      return { kind: 'exact', value: roundTransFatGrams(raw) };
    case 'cholesterol':
      return roundCholesterolMg(raw);
    case 'sodium':
      return { kind: 'exact', value: roundSodiumMg(raw) };
    case 'totalCarbs':
    case 'fiber':
    case 'sugars':
    case 'addedSugars':
      return roundCarbGrams(raw);
    case 'protein':
      return { kind: 'exact', value: roundProteinGrams(raw) };
    default:
      return { kind: 'exact', value: 0 };
  }
};

const RULE = 'border-black';

interface NutritionLabelProps {
  recipe: Recipe;
  ingredients: Ingredient[];
  recipes: Recipe[];
}

const NutritionLabel: React.FC<NutritionLabelProps> = ({ recipe, ingredients, recipes }) => {
  const ingredientsById = useMemo(
    () => Object.fromEntries(ingredients.map(i => [i.id, i])),
    [ingredients],
  );
  const recipesById = useMemo(
    () => Object.fromEntries(recipes.map(r => [r.id, r])),
    [recipes],
  );

  const { result, error } = useMemo(() => {
    try {
      return { result: nutritionPerPortion(recipe, recipesById, ingredientsById), error: null as string | null };
    } catch (e: any) {
      return { result: null, error: e.message as string };
    }
  }, [recipe, recipesById, ingredientsById]);

  const presence = useMemo(
    () => collectFieldPresence(recipe, recipesById, ingredientsById),
    [recipe, recipesById, ingredientsById],
  );

  if (error) {
    return (
      <div className="bg-surface border border-line rounded-card p-[21px] flex items-start gap-[8px]">
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-[1px]" />
        <p className="text-xs text-red-500">{error}</p>
      </div>
    );
  }
  if (!result) return null;

  const { totals, allergens, completeness } = result;
  const big9Allergens = allergens.filter(a => BIG_9.includes(a));
  const otherCanonicalAllergens = allergens.filter(a => CANONICAL_ALLERGENS.includes(a) && !BIG_9.includes(a));
  const nonStandardAllergens = allergens.filter(a => !CANONICAL_ALLERGENS.includes(a));
  const caloriesPresent = presence.has('calories');
  const caloriesDisplay = caloriesPresent ? String(roundCalories(totals.calories)) : '—';

  const skippedFlags = completeness.flags.filter(f => f.skipped);

  const resolveFlagName = (flag: NutritionFlag): string => {
    const name = flag.type === 'ingredient'
      ? ingredientsById[flag.refId]?.name
      : recipesById[flag.refId]?.name;
    return name ?? '(unknown item)';
  };

  return (
    <div className="bg-surface border border-line rounded-card p-[21px] space-y-[13px]">
      {!completeness.isComplete && (
        <div className="flex items-start gap-[8px] text-saffron">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-[1px]" />
          <p className="text-[11px] font-bold">This label is incomplete — not all lines contributed verified data. See notes below.</p>
        </div>
      )}

      {/* Regulatory panel — black-on-white, not a brand surface. */}
      <div className="bg-white text-black border-[1px] border-black font-sans max-w-[320px]">
        <div className="p-[8px]">
          <h2 className="text-3xl font-black leading-none">Nutrition Facts</h2>
          <div className={`mt-[5px] pt-[3px] border-t-[1px] ${RULE} text-xs`}>
            Servings Per Recipe: {recipe.portions}
          </div>
          <div className="text-xs">Serving Size: 1 portion</div>
        </div>

        <div className={`border-t-[10px] ${RULE} px-[8px] pt-[3px]`}>
          <p className="text-[11px] font-bold">Amount Per Serving</p>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black">Calories</span>
            <span className="text-3xl font-black">{caloriesDisplay}</span>
          </div>
        </div>

        <div className={`border-t-[4px] ${RULE} px-[8px] pt-[2px] pb-[3px] text-right text-[10px] font-bold`}>
          % Daily Value*
        </div>

        <div className="px-[8px]">
          {ROWS.map(row => {
            const present = presence.has(row.key);
            const raw = totals[row.key];
            const rounded = present ? roundRow(row.key, raw) : null;
            const dv = present && row.dvKey ? percentDV(raw, row.dvKey) : null;
            const indentClass = row.indent === 2 ? 'pl-[26px]' : row.indent === 1 ? 'pl-[13px]' : '';
            return (
              <div key={row.key} className={`flex justify-between border-t-[1px] ${RULE} py-[2px] text-[11px]`}>
                <span className={indentClass}>
                  {row.indent === 2 ? row.label : <><span className="font-bold">{row.label}</span></>}
                  {present && rounded && ` ${formatAmount(rounded, row.unit)}`}
                  {!present && ' —'}
                </span>
                <span className="font-bold">{dv != null ? `${dv}%` : (row.dvKey ? '—' : '')}</span>
              </div>
            );
          })}
        </div>

        {big9Allergens.length > 0 && (
          <div className={`border-t-[4px] ${RULE} px-[8px] py-[5px] text-[11px] font-bold`}>
            Contains: {big9Allergens.join(', ')}
          </div>
        )}

        <div className={`border-t-[4px] ${RULE} px-[8px] py-[5px] text-[9px] leading-tight`}>
          * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
        </div>
      </div>

      <div className="space-y-[5px]">
        {otherCanonicalAllergens.length > 0 && (
          <p className="text-[10px] text-navy font-bold">Also contains: {otherCanonicalAllergens.join(', ')}</p>
        )}
        {completeness.containsAiEstimatedData && (
          <p className="text-[10px] text-saffron font-bold">Contains AI-estimated nutrition data — not verified.</p>
        )}
        {completeness.hasVolumeApproximation && (
          <p className="text-[10px] text-slate">Volume-measured ingredients were approximated 1:1 (ml treated as grams).</p>
        )}
        {skippedFlags.length > 0 && (
          <div className="text-[10px] text-red-500">
            <p className="font-bold">Excluded from this label:</p>
            <ul className="list-disc list-inside">
              {skippedFlags.map((f, idx) => (
                <li key={`${f.refId}-${idx}`}>{resolveFlagName(f)} — {flagReasonLabel(f.reason)}</li>
              ))}
            </ul>
          </div>
        )}
        {nonStandardAllergens.length > 0 && (
          <p className="text-[10px] text-red-500 font-bold">
            Non-standard allergen tags on file: {nonStandardAllergens.join(', ')} — not shown in "Contains:" above; fix on the ingredient record.
          </p>
        )}
      </div>
    </div>
  );
};

export default NutritionLabel;
