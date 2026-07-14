/**
 * src/lib/fdaRounding.ts
 * FDA nutrition label rounding rules (21 CFR 101.9(c)) and %DV math.
 * Pure functions, no React. Operates on raw totals from nutritionEngine.ts —
 * does not touch that file's math, only consumes its output.
 */

/** A declared amount is either an exact rounded value, or a "less than N"
 * threshold statement — the two label-text shapes 21 CFR 101.9(c) allows. */
export type RoundedAmount =
  | { kind: 'exact'; value: number }
  | { kind: 'lessThan'; value: number };

const roundToNearest = (v: number, step: number): number => {
  const r = Math.round(v / step) * step;
  return Math.round(r * 1000) / 1000; // clean up float artifacts (e.g. 2.4999999998)
};

/** Calories: <5 → 0; ≤50 → nearest 5; >50 → nearest 10. */
export const roundCalories = (v: number): number => {
  if (v < 5) return 0;
  if (v <= 50) return roundToNearest(v, 5);
  return roundToNearest(v, 10);
};

/** Total fat, saturated fat, and trans fat all share this rule: <0.5g → 0; <5g → nearest 0.5g; ≥5g → nearest 1g. */
export const roundFatGrams = (v: number): number => {
  if (v < 0.5) return 0;
  if (v < 5) return roundToNearest(v, 0.5);
  return roundToNearest(v, 1);
};

export const roundTransFatGrams = roundFatGrams;

/** Cholesterol: <2mg → 0; ≤5mg → "less than 5mg"; >5mg → nearest 5mg. */
export const roundCholesterolMg = (v: number): RoundedAmount => {
  if (v < 2) return { kind: 'exact', value: 0 };
  if (v <= 5) return { kind: 'lessThan', value: 5 };
  return { kind: 'exact', value: roundToNearest(v, 5) };
};

/** Sodium: <5mg → 0; 5–140mg → nearest 5mg; >140mg → nearest 10mg. */
export const roundSodiumMg = (v: number): number => {
  if (v < 5) return 0;
  if (v <= 140) return roundToNearest(v, 5);
  return roundToNearest(v, 10);
};

/** Carbs, fiber, sugars, and added sugars all share this rule: <0.5g → 0; <1g → "less than 1g"; ≥1g → nearest 1g. */
export const roundCarbGrams = (v: number): RoundedAmount => {
  if (v < 0.5) return { kind: 'exact', value: 0 };
  if (v < 1) return { kind: 'lessThan', value: 1 };
  return { kind: 'exact', value: roundToNearest(v, 1) };
};

/** Protein: nearest 1g. */
export const roundProteinGrams = (v: number): number => roundToNearest(v, 1);

/** FDA adult daily values for the nutrients this label declares a %DV for. */
export const DAILY_VALUES = {
  totalFat: 78,
  saturatedFat: 20,
  cholesterol: 300,
  sodium: 2300,
  totalCarbs: 275,
  fiber: 28,
  addedSugars: 50,
} as const satisfies Record<string, number>;

export type DailyValueKey = keyof typeof DAILY_VALUES;

/** %DV is computed from the raw (unrounded) amount per 21 CFR 101.9(c)(7), not the rounded declared amount. */
export const percentDV = (rawAmount: number, dailyValueKey: DailyValueKey): number =>
  Math.round((rawAmount / DAILY_VALUES[dailyValueKey]) * 100);
