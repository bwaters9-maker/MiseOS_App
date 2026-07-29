import { describe, it, expect } from 'vitest';
import {
  roundCalories,
  roundFatGrams,
  roundTransFatGrams,
  roundCholesterolMg,
  roundSodiumMg,
  roundCarbGrams,
  roundProteinGrams,
  percentDV,
  DAILY_VALUES,
} from './fdaRounding';

// All expected values are computed by hand from 21 CFR 101.9(c), with the
// tier boundaries deliberately exercised.

describe('roundCalories', () => {
  it('declares 0 below 5', () => {
    expect(roundCalories(0)).toBe(0);
    expect(roundCalories(4.9)).toBe(0);
  });
  it('rounds to the nearest 5 through 50', () => {
    expect(roundCalories(5)).toBe(5);
    expect(roundCalories(12)).toBe(10);
    expect(roundCalories(13)).toBe(15);
    expect(roundCalories(50)).toBe(50);
  });
  it('rounds to the nearest 10 above 50', () => {
    expect(roundCalories(51)).toBe(50);
    expect(roundCalories(55)).toBe(60);
    expect(roundCalories(124)).toBe(120);
  });
});

describe('roundFatGrams', () => {
  it('declares 0 below 0.5g', () => {
    expect(roundFatGrams(0)).toBe(0);
    expect(roundFatGrams(0.4)).toBe(0);
  });
  it('rounds to the nearest 0.5g below 5g', () => {
    expect(roundFatGrams(0.5)).toBe(0.5);
    expect(roundFatGrams(2.2)).toBe(2);
    expect(roundFatGrams(2.3)).toBe(2.5);
  });
  it('rounds to the nearest 1g at or above 5g', () => {
    expect(roundFatGrams(5)).toBe(5);
    expect(roundFatGrams(5.4)).toBe(5);
    expect(roundFatGrams(5.5)).toBe(6);
    expect(roundFatGrams(7.6)).toBe(8);
  });
  it('trans fat shares the fat rule', () => {
    expect(roundTransFatGrams).toBe(roundFatGrams);
    expect(roundTransFatGrams(2.3)).toBe(2.5);
    expect(roundTransFatGrams(0.4)).toBe(0);
  });
});

describe('roundCholesterolMg', () => {
  it('declares an exact 0 below 2mg', () => {
    expect(roundCholesterolMg(0)).toEqual({ kind: 'exact', value: 0 });
    expect(roundCholesterolMg(1.9)).toEqual({ kind: 'exact', value: 0 });
  });
  it('declares "less than 5mg" from 2 through 5mg', () => {
    expect(roundCholesterolMg(2)).toEqual({ kind: 'lessThan', value: 5 });
    expect(roundCholesterolMg(5)).toEqual({ kind: 'lessThan', value: 5 });
  });
  it('rounds to the nearest 5mg above 5mg', () => {
    expect(roundCholesterolMg(6)).toEqual({ kind: 'exact', value: 5 });
    expect(roundCholesterolMg(7.5)).toEqual({ kind: 'exact', value: 10 });
    expect(roundCholesterolMg(13)).toEqual({ kind: 'exact', value: 15 });
  });
});

describe('roundSodiumMg', () => {
  it('declares 0 below 5mg', () => {
    expect(roundSodiumMg(4.9)).toBe(0);
  });
  it('rounds to the nearest 5mg from 5 through 140mg', () => {
    expect(roundSodiumMg(5)).toBe(5);
    expect(roundSodiumMg(8)).toBe(10);
    expect(roundSodiumMg(137)).toBe(135);
    expect(roundSodiumMg(140)).toBe(140);
  });
  it('rounds to the nearest 10mg above 140mg', () => {
    expect(roundSodiumMg(141)).toBe(140);
    expect(roundSodiumMg(145)).toBe(150);
  });
});

describe('roundCarbGrams', () => {
  it('declares an exact 0 below 0.5g', () => {
    expect(roundCarbGrams(0.4)).toEqual({ kind: 'exact', value: 0 });
  });
  it('declares "less than 1g" from 0.5 through <1g', () => {
    expect(roundCarbGrams(0.5)).toEqual({ kind: 'lessThan', value: 1 });
    expect(roundCarbGrams(0.9)).toEqual({ kind: 'lessThan', value: 1 });
  });
  it('rounds to the nearest 1g at or above 1g', () => {
    expect(roundCarbGrams(1)).toEqual({ kind: 'exact', value: 1 });
    expect(roundCarbGrams(1.5)).toEqual({ kind: 'exact', value: 2 });
    expect(roundCarbGrams(2.6)).toEqual({ kind: 'exact', value: 3 });
  });
});

describe('roundProteinGrams', () => {
  it('rounds to the nearest 1g', () => {
    expect(roundProteinGrams(0.4)).toBe(0);
    expect(roundProteinGrams(2.4)).toBe(2);
    expect(roundProteinGrams(2.5)).toBe(3);
    expect(roundProteinGrams(10.6)).toBe(11);
  });
});

describe('percentDV', () => {
  it('uses the published daily values', () => {
    expect(DAILY_VALUES).toEqual({
      totalFat: 78,
      saturatedFat: 20,
      cholesterol: 300,
      sodium: 2300,
      totalCarbs: 275,
      fiber: 28,
      addedSugars: 50,
    });
  });

  it('computes (raw / DV) × 100, rounded to a whole percent', () => {
    expect(percentDV(78, 'totalFat')).toBe(100);
    expect(percentDV(39, 'totalFat')).toBe(50);
    expect(percentDV(5, 'saturatedFat')).toBe(25);
    expect(percentDV(150, 'cholesterol')).toBe(50);
    expect(percentDV(575, 'sodium')).toBe(25);
    expect(percentDV(68.75, 'totalCarbs')).toBe(25);
    expect(percentDV(7, 'fiber')).toBe(25);
    expect(percentDV(12.5, 'addedSugars')).toBe(25);
  });

  it('rounds the percentage itself (half rounds up)', () => {
    // 6.25 / 50 × 100 = 12.5 → 13
    expect(percentDV(6.25, 'addedSugars')).toBe(13);
  });

  it('is computed from the raw amount, not the rounded declared amount (21 CFR 101.9(c)(7))', () => {
    // 2.6g added sugars declares as 3g (carb rule), but %DV uses the raw 2.6:
    // 2.6 / 50 × 100 = 5.2 → 5, not 3/50 × 100 = 6.
    expect(percentDV(2.6, 'addedSugars')).toBe(5);
  });
});
