import type { MeasureType } from '../types';

export type UnitSystem = 'imperial' | 'metric';

export type DisplayUnit = 'g' | 'kg' | 'oz' | 'lb' | 'ml' | 'L' | 'fl oz' | 'qt' | 'each';

const FACTORS: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
  ml: 1,
  L: 1000,
  'fl oz': 29.5735,
  qt: 946.353,
  each: 1,
};

export const toBase = (value: number, unit: DisplayUnit): number =>
  value * (FACTORS[unit] ?? 1);

export const fromBase = (base: number, unit: DisplayUnit): number => {
  const f = FACTORS[unit] ?? 1;
  return f > 0 ? base / f : base;
};

export const displayUnitsFor = (measureType: MeasureType, system: UnitSystem): DisplayUnit[] => {
  if (measureType === 'each') return ['each'];
  if (system === 'imperial') return measureType === 'weight' ? ['oz', 'lb'] : ['fl oz', 'qt'];
  return measureType === 'weight' ? ['g', 'kg'] : ['ml', 'L'];
};

export const defaultDisplayUnit = (measureType: MeasureType, system: UnitSystem): DisplayUnit => {
  const units = displayUnitsFor(measureType, system);
  return units[1] ?? units[0];
};

export const smartUnit = (
  baseValue: number,
  measureType: MeasureType,
  system: UnitSystem,
): { value: number; unit: DisplayUnit } => {
  if (measureType === 'each') return { value: baseValue, unit: 'each' };
  const units = displayUnitsFor(measureType, system);
  const smaller = units[0];
  const larger = units[1];
  if (!larger) return { value: fromBase(baseValue, smaller), unit: smaller };
  const largeVal = fromBase(baseValue, larger);
  return largeVal >= 1
    ? { value: largeVal, unit: larger }
    : { value: fromBase(baseValue, smaller), unit: smaller };
};

export const costPerDisplayUnit = (
  costPerBase: number,
  measureType: MeasureType,
  system: UnitSystem,
): { cost: number; unit: string } => {
  if (measureType === 'each') return { cost: costPerBase, unit: 'each' };
  if (system === 'imperial') {
    if (measureType === 'weight') return { cost: costPerBase * 28.3495, unit: 'oz' };
    return { cost: costPerBase * 29.5735, unit: 'fl oz' };
  }
  if (measureType === 'weight') return { cost: costPerBase * 100, unit: '100g' };
  return { cost: costPerBase * 100, unit: '100ml' };
};
