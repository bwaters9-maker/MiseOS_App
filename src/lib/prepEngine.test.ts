import { describe, it, expect } from 'vitest';
import { activeMinutesValue, inactiveMinutesValue, totalMinutes, needsTimeReentry, hasTimeEstimate, formatPrepTime, prepMinutesValue, onHandValue, makeQty, printableItems, sheetItems, sortPrepItems, buildPrintSheet } from './prepEngine';
import type { PrepItem } from '../types';

// par 1 / onHand 0 by default so a fixture has something to make and
// reaches the sheet unless a test says otherwise (P-037 filters Make 0).
const mkItem = (o: Partial<PrepItem> & { id: string; name: string }): PrepItem => ({
  assignedStation: 'Sauté',
  unit: 'lb',
  onHand: 0,
  par: 1,
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

describe('hasTimeEstimate / noEstimate (P-038)', () => {
  it('is true only when a real hands-on number is stored and the flag is not set', () => {
    expect(hasTimeEstimate(mkItem({ id: '1', name: 'Carrots', activeMinutes: 20 }))).toBe(true);
    expect(hasTimeEstimate(mkItem({ id: '1', name: 'Carrots', activeMinutes: 20, noEstimate: false }))).toBe(true);
  });

  it('is false for a declared no-estimate item, a legacy item, and a bare item', () => {
    expect(hasTimeEstimate(mkItem({ id: '1', name: 'Tenderloin', noEstimate: true }))).toBe(false);
    expect(hasTimeEstimate(mkItem({ id: '1', name: 'Stock', prepMinutes: 45 }))).toBe(false);
    expect(hasTimeEstimate(mkItem({ id: '1', name: 'Apples' }))).toBe(false);
  });

  it('the flag wins over a stale number — it cannot leak back into the sort or the sheet', () => {
    const stale = mkItem({ id: '1', name: 'Tenderloin', noEstimate: true, activeMinutes: 45, inactiveMinutes: 60 });
    expect(hasTimeEstimate(stale)).toBe(false);
    expect(activeMinutesValue(stale)).toBe(0);
    expect(inactiveMinutesValue(stale)).toBe(0);
    expect(totalMinutes(stale)).toBe(0);
  });

  it('"no estimate" and "0 minutes" are different stored states, not the same value', () => {
    // The whole point of the ruling: "takes no time" and "time unknown"
    // must survive the round trip as different records.
    const unknown = mkItem({ id: '1', name: 'A', noEstimate: true });
    const zero = mkItem({ id: '2', name: 'B', activeMinutes: 0 });
    expect(hasTimeEstimate(unknown)).toBe(false);
    expect(hasTimeEstimate(zero)).toBe(true);
    expect(unknown).not.toHaveProperty('activeMinutes');
  });

  it('a legacy item the chef marks no-estimate is resolved, not still flagged for re-entry', () => {
    expect(needsTimeReentry(mkItem({ id: '1', name: 'Stock', prepMinutes: 45, noEstimate: true }))).toBe(false);
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
  it('reads as one line of English when there is a hold', () => {
    // The P1 case from the Grill read-through: "10 ACTIVE / 720 WAIT"
    // wrapped to two lines on paper and read as raw data.
    expect(formatPrepTime(mkItem({ id: '1', name: 'Brined Pork Chops', activeMinutes: 10, inactiveMinutes: 720 })))
      .toBe('10 min + 12 hr wait');
  });

  it('shows hands-on alone in minutes when there is no hold', () => {
    expect(formatPrepTime(mkItem({ id: '1', name: 'Butchery', activeMinutes: 90 }))).toBe('90 min');
    expect(formatPrepTime(mkItem({ id: '1', name: 'Butchery', activeMinutes: 90, inactiveMinutes: 0 }))).toBe('90 min');
  });

  it('converts wait to whole hours only when it divides evenly', () => {
    const wait = (m: number) => formatPrepTime(mkItem({ id: '1', name: 'x', activeMinutes: 5, inactiveMinutes: m }));
    expect(wait(60)).toBe('5 min + 1 hr wait');
    expect(wait(120)).toBe('5 min + 2 hr wait');
    expect(wait(90)).toBe('5 min + 1 hr 30 min wait');
    expect(wait(45)).toBe('5 min + 45 min wait');
    expect(wait(1445)).toBe('5 min + 24 hr 5 min wait');
  });

  it('THE CARD AND THE SHEET RENDER THE SAME STRING for the same record', () => {
    // P6. One helper, both surfaces. P1 had briefly split these in two
    // (card "10 ACTIVE / 720 WAIT", sheet "10 min + 12 hr wait"); this is
    // the assertion that keeps them from drifting apart again. The card
    // formats the PrepItem, the sheet formats the PrintSheetLine built
    // from it, and the two must be indistinguishable.
    const cases = [
      mkItem({ id: '1', name: 'Brined Pork Chops', par: 1, activeMinutes: 10, inactiveMinutes: 720 }),
      mkItem({ id: '2', name: 'Steak Frites Potatoes', par: 1, activeMinutes: 45 }),
      mkItem({ id: '3', name: 'Odd hold', par: 1, activeMinutes: 5, inactiveMinutes: 90 }),
    ];
    cases.forEach(item => {
      const card = formatPrepTime(item);
      const sheet = formatPrepTime(buildPrintSheet([item])[0]);
      expect(sheet).toBe(card);
    });
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

describe('sheetItems (P-037)', () => {
  it('drops a printable item whose computed Make is 0 — the live Grill case', () => {
    // Grilled Lemon Halves, Par 40 / On Hand 40, printed as "Make 0" on
    // the 2026-09-20 Grill sheet. A row that asks a cook to make nothing.
    const lemons = mkItem({ id: '1', name: 'Grilled Lemon Halves', par: 40, onHand: 40, activeMinutes: 10 });
    const chops = mkItem({ id: '2', name: 'Brined Pork Chops', par: 12, onHand: 4, activeMinutes: 10, inactiveMinutes: 720 });
    expect(printableItems([lemons, chops]).map(i => i.id)).toEqual(['1', '2']);
    expect(sheetItems([lemons, chops]).map(i => i.id)).toEqual(['2']);
  });

  it('drops an over-stocked item too — Make is floored at 0, not negative', () => {
    const over = mkItem({ id: '1', name: 'Carrots', par: 4, onHand: 10, activeMinutes: 5 });
    expect(sheetItems([over])).toEqual([]);
  });

  it('decides on the same computed Make the sheet renders, so a legacy quantity doc is read the same way', () => {
    // onHand absent, legacy `quantity` carries the count. If the filter
    // compared onHand >= par directly it would read undefined and the row
    // would print as Make 3 while "qualifying" as nothing to make — or the
    // reverse. One expression, one answer.
    const legacyCovered = { id: '1', name: 'Duck', assignedStation: 'Grill', unit: 'kg', par: 3, checked: false, quantity: 3, activeMinutes: 5 } as unknown as PrepItem;
    const legacyShort = { id: '2', name: 'Duck', assignedStation: 'Grill', unit: 'kg', par: 3, checked: false, quantity: 1, activeMinutes: 5 } as unknown as PrepItem;
    expect(sheetItems([legacyCovered, legacyShort]).map(i => i.id)).toEqual(['2']);
  });

  it('still excludes checked and notNeeded items, same as printableItems', () => {
    const items = [
      mkItem({ id: '1', name: 'Carrots', par: 5 }),
      mkItem({ id: '2', name: 'Beets', par: 5, checked: true }),
      mkItem({ id: '3', name: 'Squash', par: 5, notNeeded: true }),
    ];
    expect(sheetItems(items).map(i => i.id)).toEqual(['1']);
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

  it('excludes a Make 0 row from the sheet AND the history line it writes (P-037)', () => {
    // One function feeds both, so the history can never log a row the
    // paper never carried.
    const items = [
      mkItem({ id: '1', name: 'Grilled Lemon Halves', par: 40, onHand: 40, activeMinutes: 10 }),
      mkItem({ id: '2', name: 'Brined Pork Chops', par: 12, onHand: 4, activeMinutes: 10, inactiveMinutes: 720 }),
    ];
    expect(buildPrintSheet(items).map(l => l.name)).toEqual(['Brined Pork Chops']);
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

  it('writes a no-estimate line as the flag and NO numbers — never 0/0 for "unknown" (P-038)', () => {
    // A write-once audit log that recorded 0/0 here would be the exact
    // collapse the flag exists to prevent, and a naive reader (CSV, a
    // spreadsheet) must see blank, not 0, without knowing about the flag.
    const item = mkItem({ id: '1', name: 'Tenderloin', par: 1, onHand: 0, unit: 'kg', noEstimate: true });
    expect(buildPrintSheet([item])).toEqual([
      { name: 'Tenderloin', makeQty: 1, unit: 'kg', noEstimate: true },
    ]);
    expect(buildPrintSheet([item])[0]).not.toHaveProperty('activeMinutes');
    expect(buildPrintSheet([item])[0]).not.toHaveProperty('inactiveMinutes');
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
