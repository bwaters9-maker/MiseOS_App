import { describe, it, expect } from 'vitest';
import { activeMinutesValue, inactiveMinutesValue, totalMinutes, needsTimeReentry, formatPrepTime, prepMinutesValue, onHandValue, makeQty, printableItems, sortPrepItems, buildPrintSheet } from './prepEngine';
import type { PrepItem } from '../types';

const mkItem = (o: Partial<PrepItem> & { id: string; name: string }): PrepItem => ({
  assignedStation: 'Sauté',
  unit: 'lb',
  onHand: 0,
  par: 0,
  checked: false,
  ...o,
});

describe('activeMinutesValue / inactiveMinutesValue', () => {
  it('returns the set values when present, including a real 0 wait', () => {
    const item = mkItem({ id: '1', name: 'Carrots', activeMinutes: 20, inactiveMinutes: 0 });
    expect(activeMinutesValue(item)).toBe(20);
    expect(inactiveMinutesValue(item)).toBe(0);
  });

  it('defaults each to 0 when absent', () => {
    const item = mkItem({ id: '1', name: 'Carrots' });
    expect(activeMinutesValue(item)).toBe(0);
    expect(inactiveMinutesValue(item)).toBe(0);
  });
});

describe('totalMinutes', () => {
  it('sums hands-on and wait time', () => {
    expect(totalMinutes(mkItem({ id: '1', name: 'Braise', activeMinutes: 20, inactiveMinutes: 340 }))).toBe(360);
  });

  it('is the active time alone when there is no wait', () => {
    expect(totalMinutes(mkItem({ id: '1', name: 'Butchery', activeMinutes: 90 }))).toBe(90);
  });

  it('is 0 for an item with neither field — a legacy item awaiting re-entry, or a brand-new one', () => {
    expect(totalMinutes(mkItem({ id: '1', name: 'Apples' }))).toBe(0);
  });

  it('never reads the legacy prepMinutes field', () => {
    // Ruling 6: the old number's meaning is undefined, so it must not
    // reach the sort through any path. 45 here must not become the total.
    expect(totalMinutes(mkItem({ id: '1', name: 'Stock', prepMinutes: 45 }))).toBe(0);
  });
});

describe('needsTimeReentry', () => {
  it('flags an item with a legacy prepMinutes and no activeMinutes', () => {
    expect(needsTimeReentry(mkItem({ id: '1', name: 'Stock', prepMinutes: 45 }))).toBe(true);
  });

  it('clears once activeMinutes is entered, even though prepMinutes still sits in the doc', () => {
    // Re-entry never deletes the dead field; the flag keys on the
    // presence of activeMinutes, not the absence of prepMinutes.
    expect(needsTimeReentry(mkItem({ id: '1', name: 'Stock', prepMinutes: 45, activeMinutes: 20 }))).toBe(false);
  });

  it('does not flag a new item that simply has no times yet', () => {
    expect(needsTimeReentry(mkItem({ id: '1', name: 'Apples' }))).toBe(false);
  });
});

describe('prepMinutesValue (legacy reader)', () => {
  it('returns the set value when present', () => {
    expect(prepMinutesValue(mkItem({ id: '1', name: 'Carrots', prepMinutes: 20 }))).toBe(20);
  });

  it('defaults to 0 when prepMinutes is absent', () => {
    expect(prepMinutesValue(mkItem({ id: '1', name: 'Carrots' }))).toBe(0);
  });
});

describe('formatPrepTime', () => {
  it('splits into ACTIVE and WAIT when there is a hold', () => {
    expect(formatPrepTime(mkItem({ id: '1', name: 'Braise', activeMinutes: 20, inactiveMinutes: 340 })))
      .toBe('20 ACTIVE / 340 WAIT');
  });

  it('shows a single number when there is no hold, rather than "90 ACTIVE / 0 WAIT"', () => {
    expect(formatPrepTime(mkItem({ id: '1', name: 'Butchery', activeMinutes: 90 }))).toBe('90 min');
    expect(formatPrepTime(mkItem({ id: '1', name: 'Butchery', activeMinutes: 90, inactiveMinutes: 0 }))).toBe('90 min');
  });

  it('formats a print sheet line identically to the item it came from', () => {
    // The row and the sheet must never drift into two formats.
    const item = mkItem({ id: '1', name: 'Braise', par: 1, activeMinutes: 20, inactiveMinutes: 340 });
    expect(formatPrepTime(buildPrintSheet([item])[0])).toBe(formatPrepTime(item));
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
  it('sorts the printable tier by totalMinutes descending', () => {
    const short = mkItem({ id: '1', name: 'Salt', activeMinutes: 2 });
    const long = mkItem({ id: '2', name: 'Stock', activeMinutes: 90 });
    const mid = mkItem({ id: '3', name: 'Onions', activeMinutes: 15 });
    expect(sortPrepItems([short, long, mid]).map(i => i.id)).toEqual(['2', '3', '1']);
  });

  it('THE INVERSION: a long-hold item with tiny hands-on time sorts above a long straight-active item', () => {
    // The whole reason P-034 sorts on total. The braise is 5 minutes of
    // work and six hours of clock; the butchery is 90 minutes of solid
    // work. Sorting on active alone would start the braise second and
    // miss service.
    const braise = mkItem({ id: '1', name: 'Short rib braise', activeMinutes: 5, inactiveMinutes: 355 });
    const butchery = mkItem({ id: '2', name: 'Butchery', activeMinutes: 90 });
    expect(sortPrepItems([butchery, braise]).map(i => i.id)).toEqual(['1', '2']);
    // And the inversion is real, not an artifact of the input order.
    expect(sortPrepItems([braise, butchery]).map(i => i.id)).toEqual(['1', '2']);
  });

  it('sorts an item with no times below every item with a real estimate, within the printable tier', () => {
    const estimated = mkItem({ id: '1', name: 'Zucchini', activeMinutes: 1 });
    const unestimated = mkItem({ id: '2', name: 'Apples' }); // neither field
    // Name order alone would put Apples first; the 0 default must still
    // sink it below the 1-minute item.
    expect(sortPrepItems([unestimated, estimated]).map(i => i.id)).toEqual(['1', '2']);
  });

  it('sinks a legacy item awaiting re-entry to the bottom of its tier rather than ranking it on the old number', () => {
    // Ruling 6 in the sort: a legacy 6-hour braise does not get to keep
    // its place on a number nobody can interpret. It sorts last until a
    // chef re-enters it — the same pressure P-012 applied to a missing
    // estimate.
    const legacy = mkItem({ id: '1', name: 'Aged stock', prepMinutes: 360 });
    const entered = mkItem({ id: '2', name: 'Zucchini', activeMinutes: 1 });
    expect(sortPrepItems([legacy, entered]).map(i => i.id)).toEqual(['2', '1']);
  });

  it('tiebreaks equal totalMinutes alphabetically by name', () => {
    const b = mkItem({ id: '1', name: 'Beets', activeMinutes: 10 });
    const a = mkItem({ id: '2', name: 'Artichokes', activeMinutes: 10 });
    expect(sortPrepItems([b, a]).map(i => i.id)).toEqual(['2', '1']);
  });

  it('tiebreaks on total, not on how the total is composed', () => {
    // 10 = 10 active, and 10 = 4 active + 6 wait. Same total, so the
    // name tiebreak decides; composition never does.
    const b = mkItem({ id: '1', name: 'Beets', activeMinutes: 10 });
    const a = mkItem({ id: '2', name: 'Artichokes', activeMinutes: 4, inactiveMinutes: 6 });
    expect(sortPrepItems([b, a]).map(i => i.id)).toEqual(['2', '1']);
  });

  it('orders the three tiers: printable, then checked, then notNeeded', () => {
    const notNeeded = mkItem({ id: '1', name: 'Squash', notNeeded: true, activeMinutes: 99 });
    const checked = mkItem({ id: '2', name: 'Peas', checked: true, activeMinutes: 99 });
    const active = mkItem({ id: '3', name: 'Corn', activeMinutes: 1 });
    // active sorts last within its own tier by total (only item there),
    // but its TIER still comes before checked's and notNeeded's
    // regardless of their higher totals — tier beats time.
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
    const short = mkItem({ id: '1', name: 'Salt', activeMinutes: 2 });
    const long = mkItem({ id: '2', name: 'Stock', activeMinutes: 90 });
    expect(buildPrintSheet([short, long]).map(l => l.name)).toEqual(['Stock', 'Salt']);
  });

  it('orders lines by total, so the long-hold item prints first', () => {
    const braise = mkItem({ id: '1', name: 'Short rib braise', activeMinutes: 5, inactiveMinutes: 355 });
    const butchery = mkItem({ id: '2', name: 'Butchery', activeMinutes: 90 });
    expect(buildPrintSheet([butchery, braise]).map(l => l.name)).toEqual(['Short rib braise', 'Butchery']);
  });

  it('carries makeQty, unit, and both time fields onto the line', () => {
    const item = mkItem({ id: '1', name: 'Carrots', par: 10, onHand: 4, unit: 'lb', activeMinutes: 20, inactiveMinutes: 340 });
    expect(buildPrintSheet([item])).toEqual([
      { name: 'Carrots', makeQty: 6, unit: 'lb', activeMinutes: 20, inactiveMinutes: 340 },
    ]);
  });

  it('writes an explicit 0 for a missing wait rather than omitting the key', () => {
    // The stored prep_history line is a fixed shape; a reader must never
    // have to distinguish "no wait" from "field absent".
    const item = mkItem({ id: '1', name: 'Carrots', par: 10, onHand: 4, unit: 'lb', activeMinutes: 20 });
    expect(buildPrintSheet([item])).toEqual([
      { name: 'Carrots', makeQty: 6, unit: 'lb', activeMinutes: 20, inactiveMinutes: 0 },
    ]);
  });

  it('never carries a legacy prepMinutes onto the line, under either time field', () => {
    const item = mkItem({ id: '1', name: 'Aged stock', par: 10, onHand: 4, unit: 'lb', prepMinutes: 360 });
    expect(buildPrintSheet([item])).toEqual([
      { name: 'Aged stock', makeQty: 6, unit: 'lb', activeMinutes: 0, inactiveMinutes: 0 },
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
