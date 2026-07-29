import { describe, it, expect } from 'vitest';
import {
  toBase,
  fromBase,
  measureTypeOfUnit,
  displayUnitsFor,
  defaultDisplayUnit,
  costPerDisplayUnit,
  type DisplayUnit,
} from './units';

describe('toBase', () => {
  it('scales weight units to grams', () => {
    expect(toBase(1, 'g')).toBe(1);
    expect(toBase(2, 'kg')).toBe(2000);
    expect(toBase(5, 'oz')).toBeCloseTo(141.7475, 6);
    expect(toBase(3, 'lb')).toBeCloseTo(1360.776, 6);
  });

  it('scales volume units to millilitres', () => {
    expect(toBase(1, 'ml')).toBe(1);
    expect(toBase(2, 'L')).toBe(2000);
    expect(toBase(4, 'fl oz')).toBeCloseTo(118.294, 6);
    expect(toBase(2, 'qt')).toBeCloseTo(1892.706, 6);
  });

  it('leaves each as a plain count', () => {
    expect(toBase(7, 'each')).toBe(7);
  });
});

describe('toBase / fromBase round-trips', () => {
  // Every display unit, both systems: a value pushed to base and pulled back
  // returns to itself.
  const units: DisplayUnit[] = ['g', 'kg', 'oz', 'lb', 'ml', 'L', 'fl oz', 'qt', 'each'];
  const values = [1, 5, 12.5, 0.25];

  for (const unit of units) {
    for (const v of values) {
      it(`round-trips ${v} ${unit}`, () => {
        expect(fromBase(toBase(v, unit), unit)).toBeCloseTo(v, 10);
      });
    }
  }
});

describe('invalid-unit fallback', () => {
  it('toBase treats an unknown unit as factor 1', () => {
    expect(toBase(5, 'bogus' as DisplayUnit)).toBe(5);
  });

  it('fromBase treats an unknown unit as factor 1', () => {
    expect(fromBase(5, 'bogus' as DisplayUnit)).toBe(5);
  });

  it('an unknown unit still round-trips (both directions use factor 1)', () => {
    expect(fromBase(toBase(42, 'bogus' as DisplayUnit), 'bogus' as DisplayUnit)).toBe(42);
  });
});

describe('measureTypeOfUnit', () => {
  it('maps weight units', () => {
    for (const u of ['g', 'kg', 'oz', 'lb'] as DisplayUnit[]) {
      expect(measureTypeOfUnit(u)).toBe('weight');
    }
  });
  it('maps volume units', () => {
    for (const u of ['ml', 'L', 'fl oz', 'qt'] as DisplayUnit[]) {
      expect(measureTypeOfUnit(u)).toBe('volume');
    }
  });
  it('maps each', () => {
    expect(measureTypeOfUnit('each')).toBe('each');
  });
});

describe('displayUnitsFor', () => {
  it('gives system-appropriate weight units', () => {
    expect(displayUnitsFor('weight', 'imperial')).toEqual(['oz', 'lb']);
    expect(displayUnitsFor('weight', 'metric')).toEqual(['g', 'kg']);
  });
  it('gives system-appropriate volume units', () => {
    expect(displayUnitsFor('volume', 'imperial')).toEqual(['fl oz', 'qt']);
    expect(displayUnitsFor('volume', 'metric')).toEqual(['ml', 'L']);
  });
  it('gives each regardless of system', () => {
    expect(displayUnitsFor('each', 'imperial')).toEqual(['each']);
    expect(displayUnitsFor('each', 'metric')).toEqual(['each']);
  });
});

describe('defaultDisplayUnit', () => {
  it('is the larger unit of each measure/system pair', () => {
    expect(defaultDisplayUnit('weight', 'imperial')).toBe('lb');
    expect(defaultDisplayUnit('weight', 'metric')).toBe('kg');
    expect(defaultDisplayUnit('volume', 'imperial')).toBe('qt');
    expect(defaultDisplayUnit('volume', 'metric')).toBe('L');
  });
  it('is each for count measures', () => {
    expect(defaultDisplayUnit('each', 'imperial')).toBe('each');
    expect(defaultDisplayUnit('each', 'metric')).toBe('each');
  });
});

describe('costPerDisplayUnit', () => {
  // A known base rate of $0.02 per canonical base unit (per g / per ml),
  // converted to the per-display-unit rate each panel actually shows.
  const rate = 0.02;

  it('converts a weight rate to cost per ounce (imperial)', () => {
    const { cost, unit } = costPerDisplayUnit(rate, 'weight', 'imperial');
    expect(unit).toBe('oz');
    expect(cost).toBeCloseTo(0.02 * 28.3495, 10); // 0.56699 / oz
  });

  it('converts a weight rate to cost per 100g (metric)', () => {
    const { cost, unit } = costPerDisplayUnit(rate, 'weight', 'metric');
    expect(unit).toBe('100g');
    expect(cost).toBeCloseTo(2, 10); // 0.02 * 100
  });

  it('converts a volume rate to cost per fluid ounce (imperial)', () => {
    const { cost, unit } = costPerDisplayUnit(rate, 'volume', 'imperial');
    expect(unit).toBe('fl oz');
    expect(cost).toBeCloseTo(0.02 * 29.5735, 10); // 0.59147 / fl oz
  });

  it('converts a volume rate to cost per 100ml (metric)', () => {
    const { cost, unit } = costPerDisplayUnit(rate, 'volume', 'metric');
    expect(unit).toBe('100ml');
    expect(cost).toBeCloseTo(2, 10);
  });

  it('passes an each rate through unchanged, both systems', () => {
    expect(costPerDisplayUnit(rate, 'each', 'imperial')).toEqual({ cost: rate, unit: 'each' });
    expect(costPerDisplayUnit(rate, 'each', 'metric')).toEqual({ cost: rate, unit: 'each' });
  });
});
