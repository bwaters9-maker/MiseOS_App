import { describe, it, expect } from 'vitest';
import { prepMinutesValue, onHandValue, makeQty, printableItems, sortPrepItems, buildPrintSheet } from './prepEngine';
import type { PrepItem } from '../types';

const mkItem = (o: Partial<PrepItem> & { id: string; name: string }): PrepItem => ({
  assignedStation: 'Sauté',
  unit: 'lb',
  onHand: 0,
  par: 0,
  checked: false,
  ...o,
});

describe('prepMinutesValue', () => {
  it('returns the set value when present', () => {
    expect(prepMinutesValue(mkItem({ id: '1', name: 'Carrots', prepMinutes: 20 }))).toBe(20);
  });

  it('defaults to 0 when prepMinutes is absent', () => {
    expect(prepMinutesValue(mkItem({ id: '1', name: 'Carrots' }))).toBe(0);
  });
});

describe('onHandValue', () => {
  it('returns onHand when present, even when it is 0', () => {
    expect(onHandValue(mkItem({ id: '1', name: 'Carrots', onHand: 0 }))).toBe(0);
    expect(onHandValue(mkItem({ id: '1', name: 'Carrots', onHand: 5 }))).toBe(5);
  });

  it('falls back to a legacy quantity field when onHand is missing entirely', () => {
    // Reproduces a real doc written by the pre-rebuild PrepRegistrationForm.tsx:
    // onHand didn't exist yet, the same value was stored under quantity.
    const legacy = { id: '1', name: 'Duck', assignedStation: 'Grill', unit: 'kg', par: 1, checked: false, quantity: 3 } as unknown as PrepItem;
    expect(onHandValue(legacy)).toBe(3);
  });

  it('defaults to 0 when neither onHand nor a legacy quantity is present', () => {
    const bare = { id: '1', name: 'Duck', assignedStation: 'Grill', unit: 'kg', par: 1, checked: false } as unknown as PrepItem;
    expect(onHandValue(bare)).toBe(0);
  });
});

describe('makeQty', () => {
  it('returns par minus onHand when onHand is below par', () => {
    expect(makeQty(mkItem({ id: '1', name: 'Carrots', par: 10, onHand: 4 }))).toBe(6);
  });

  it('floors at 0 rather than going negative when onHand exceeds par', () => {
    expect(makeQty(mkItem({ id: '1', name: 'Carrots', par: 4, onHand: 10 }))).toBe(0);
  });

  it('falls back to a legacy quantity field, same as onHandValue, rather than computing NaN', () => {
    const legacy = { id: '1', name: 'Duck', assignedStation: 'Grill', unit: 'kg', par: 5, checked: false, quantity: 2 } as unknown as PrepItem;
    expect(makeQty(legacy)).toBe(3);
  });

  it('returns 0 when onHand equals par', () => {
    expect(makeQty(mkItem({ id: '1', name: 'Carrots', par: 5, onHand: 5 }))).toBe(0);
  });
});

describe('printableItems', () => {
  it('includes an item that is neither checked nor notNeeded', () => {
    const item = mkItem({ id: '1', name: 'Carrots' });
    expect(printableItems([item])).toEqual([item]);
  });

  it('excludes a checked item on its own', () => {
    const item = mkItem({ id: '1', name: 'Carrots', checked: true });
    expect(printableItems([item])).toEqual([]);
  });

  it('excludes a notNeeded item on its own', () => {
    const item = mkItem({ id: '1', name: 'Carrots', notNeeded: true });
    expect(printableItems([item])).toEqual([]);
  });

  it('excludes an item that is both checked and notNeeded', () => {
    const item = mkItem({ id: '1', name: 'Carrots', checked: true, notNeeded: true });
    expect(printableItems([item])).toEqual([]);
  });
});

describe('sortPrepItems', () => {
  it('sorts the printable tier by prepMinutesValue descending', () => {
    const short = mkItem({ id: '1', name: 'Salt', prepMinutes: 2 });
    const long = mkItem({ id: '2', name: 'Stock', prepMinutes: 90 });
    const mid = mkItem({ id: '3', name: 'Onions', prepMinutes: 15 });
    expect(sortPrepItems([short, long, mid]).map(i => i.id)).toEqual(['2', '3', '1']);
  });

  it('sorts a missing prepMinutes below every item with a real estimate, within the printable tier', () => {
    const estimated = mkItem({ id: '1', name: 'Zucchini', prepMinutes: 1 });
    const unestimated = mkItem({ id: '2', name: 'Apples' }); // no prepMinutes at all
    // Name order alone would put Apples first; prepMinutesValue's 0
    // default must still sink it below the 1-minute item.
    expect(sortPrepItems([unestimated, estimated]).map(i => i.id)).toEqual(['1', '2']);
  });

  it('tiebreaks equal prepMinutesValue alphabetically by name', () => {
    const b = mkItem({ id: '1', name: 'Beets', prepMinutes: 10 });
    const a = mkItem({ id: '2', name: 'Artichokes', prepMinutes: 10 });
    expect(sortPrepItems([b, a]).map(i => i.id)).toEqual(['2', '1']);
  });

  it('orders the three tiers: printable, then checked, then notNeeded', () => {
    const notNeeded = mkItem({ id: '1', name: 'Squash', notNeeded: true, prepMinutes: 99 });
    const checked = mkItem({ id: '2', name: 'Peas', checked: true, prepMinutes: 99 });
    const active = mkItem({ id: '3', name: 'Corn', prepMinutes: 1 });
    // active sorts last within its own tier by prepMinutes (only item
    // there), but its TIER still comes before checked's and notNeeded's
    // regardless of their higher prepMinutes — tier beats prepMinutes.
    expect(sortPrepItems([notNeeded, checked, active]).map(i => i.id)).toEqual(['3', '2', '1']);
  });

  it('an item that is both checked and notNeeded lands in the notNeeded tier, not the checked tier', () => {
    const both = mkItem({ id: '1', name: 'Leeks', checked: true, notNeeded: true });
    const checkedOnly = mkItem({ id: '2', name: 'Kale', checked: true });
    // If "both" landed in the checked tier it would sort ahead of
    // checkedOnly alphabetically (Kale > Leeks); it doesn't, because
    // notNeeded wins tier placement unconditionally ("at the very
    // bottom" is not conditional on checked being false).
    expect(sortPrepItems([both, checkedOnly]).map(i => i.id)).toEqual(['2', '1']);
  });
});

describe('buildPrintSheet', () => {
  it('excludes checked and notNeeded items, same as printableItems', () => {
    const items = [
      mkItem({ id: '1', name: 'Carrots' }),
      mkItem({ id: '2', name: 'Beets', checked: true }),
      mkItem({ id: '3', name: 'Squash', notNeeded: true }),
    ];
    expect(buildPrintSheet(items).map(l => l.name)).toEqual(['Carrots']);
  });

  it('orders lines the same way sortPrepItems orders the printable tier', () => {
    const short = mkItem({ id: '1', name: 'Salt', prepMinutes: 2 });
    const long = mkItem({ id: '2', name: 'Stock', prepMinutes: 90 });
    expect(buildPrintSheet([short, long]).map(l => l.name)).toEqual(['Stock', 'Salt']);
  });

  it('carries makeQty, unit, and prepMinutes onto the line', () => {
    const item = mkItem({ id: '1', name: 'Carrots', par: 10, onHand: 4, unit: 'lb', prepMinutes: 20 });
    expect(buildPrintSheet([item])).toEqual([
      { name: 'Carrots', makeQty: 6, unit: 'lb', prepMinutes: 20 },
    ]);
  });

  it('includes spec when set', () => {
    const item = mkItem({ id: '1', name: 'Carrots', spec: 'oblique cut, blanched, shocked' });
    expect(buildPrintSheet([item])[0].spec).toBe('oblique cut, blanched, shocked');
  });

  it('omits spec when unset rather than printing an empty field', () => {
    const item = mkItem({ id: '1', name: 'Carrots' });
    expect(buildPrintSheet([item])[0]).not.toHaveProperty('spec');
  });
});
