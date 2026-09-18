/**
 * src/lib/prepEngine.ts
 * Pure functions for the Prep Checklist's print-to-paper workflow — sort
 * order, print eligibility, and the make-quantity math. Extracted so the
 * execution-critical sort and the print/history exclusion rule are
 * unit-tested without mounting PrepChecklist.tsx, same pattern as
 * costEngine.ts and dishDraftToRecipe.ts. No React, no Firestore.
 */
import type { PrepItem } from '../types';

/** Not a real station — the shared sentinel for the chef-visible bucket
 * of items whose stored assignedStation matches no current preset (the
 * preset was renamed or removed in Settings since the item was saved).
 * Lives here rather than in PrepChecklist.tsx so ChefDashboard.tsx's Prep
 * Sheets card can reference it without statically importing that
 * lazy-loaded view's whole module. Never a selectable value on the
 * add/edit form; only ever assigned by history. */
export const UNMATCHED_STATION_KEY = '__unmatched_station__';

/** Hands-on time; absent reads as 0, same "absent reads as a stated
 * default" convention as recipeStatus(). Absent means either a brand-new
 * item mid-entry or a legacy item awaiting re-entry (needsTimeReentry). */
export const activeMinutesValue = (item: Pick<PrepItem, 'activeMinutes'>): number =>
  item.activeMinutes ?? 0;

/** Unattended time — braise, brine, cure, chill, proof, thaw. Optional at
 * the form, so absent is the ordinary case for most prep, not a gap. */
export const inactiveMinutesValue = (item: Pick<PrepItem, 'inactiveMinutes'>): number =>
  item.inactiveMinutes ?? 0;

/**
 * Wall-clock time the item consumes. Derived, never stored (P-034 ruling
 * 1): three editable numbers where only two are independent lets a chef
 * save a total that isn't the sum, and then something has to decide which
 * wins. Same single-source reasoning as buildPrintSheet / printableItems.
 *
 * This is the sort key. Inactive time still consumes the clock — a
 * six-hour braise with five minutes hands-on has to go on before ninety
 * minutes of straight butchery, and sorting on active alone inverts the
 * order on exactly the long-hold items that wreck a prep day.
 */
export const totalMinutes = (item: Pick<PrepItem, 'activeMinutes' | 'inactiveMinutes'>): number =>
  activeMinutesValue(item) + inactiveMinutesValue(item);

/** LEGACY reader, P-034 — display-only context on a flagged item, never a
 * sort or print input. See needsTimeReentry. */
export const prepMinutesValue = (item: Pick<PrepItem, 'prepMinutes'>): number =>
  item.prepMinutes ?? 0;

/**
 * An item saved before the P-034 split: it has a prepMinutes but no
 * activeMinutes, so its stored number's meaning is undefined by
 * construction (hands-on or wall-clock, unknowable after the fact).
 * Ruling 6: flag it for re-entry, never guess it into a new field —
 * mapping it to activeMinutes is precisely the wrong guess for anything
 * with a hold. totalMinutes reads 0 for these, so a flagged item sorts
 * last until a chef re-enters it, the same pressure P-012 already applied
 * to an item with no estimate at all.
 */
export const needsTimeReentry = (item: Pick<PrepItem, 'activeMinutes' | 'prepMinutes'>): boolean =>
  item.activeMinutes == null && item.prepMinutes != null;

/**
 * onHand was renamed from `quantity` in the P-012 schema rewrite with no
 * migration write — same code-level-fallback convention as
 * KitchenEvent.attendees (renamed from `covers`, old docs read via a
 * fallback, no data migration). A doc saved by the pre-rebuild
 * PrepRegistrationForm.tsx still carries `quantity`, never `onHand`; read
 * through this rather than `item.onHand` anywhere a stored doc might
 * predate the rename, or it reads as `undefined` and every number derived
 * from it (makeQty, the edit form) breaks silently.
 */
export const onHandValue = (item: Pick<PrepItem, 'onHand'>): number =>
  item.onHand ?? (item as unknown as { quantity?: number }).quantity ?? 0;

/**
 * The production quantity — what a cook needs to make, not what's on
 * hand. Floored at 0 so an over-stocked item never prints/logs as a
 * negative "make" instruction. This is the figure that prints on the
 * sheet (labeled "Make") and freezes into prep_history as `makeQty`.
 */
export const makeQty = (item: Pick<PrepItem, 'par' | 'onHand'>): number =>
  Math.max(0, item.par - onHandValue(item));

/** Descending by totalMinutes, tiebreak alphabetical by name. Array.prototype.sort is stable, so any remaining tie keeps input order. */
const byTotalMinutesThenName = (a: PrepItem, b: PrepItem): number =>
  totalMinutes(b) - totalMinutes(a) || a.name.localeCompare(b.name);

/**
 * Whether a line still belongs on paper: not done, not skipped this
 * shift. Both `checked` and `notNeeded` exclude a line for different
 * reasons (made vs. not needed) but the same print outcome — a printed
 * row a cook cannot act on costs attention mid-service.
 */
const isPrintable = (item: Pick<PrepItem, 'checked' | 'notNeeded'>): boolean =>
  !item.checked && !item.notNeeded;

/**
 * The single source of what reaches paper. Both the print DOM
 * (PrepChecklist.tsx) and the prep_history doc it writes derive from
 * this — never their own filter — so the printed sheet and the log it
 * produces can't drift apart.
 */
export const printableItems = (items: PrepItem[]): PrepItem[] =>
  items.filter(isPrintable);

/**
 * Three tiers, in order: (1) printable — unchecked and not notNeeded,
 * by totalMinutes descending, tiebreak name; (2) checked; (3)
 * notNeeded. Tiers 2 and 3 get the same secondary sort as tier 1 for
 * predictability, though nothing print-relevant depends on it.
 *
 * An item that is both checked AND notNeeded sorts into tier 3, not
 * tier 2 — notNeeded always wins the tier placement. It's the stronger,
 * shift-defining statement ("we are not doing this at all"), and the
 * original ruling put it "at the very bottom" unconditionally, not
 * "below checked unless also notNeeded." A done-but-also-not-needed
 * item is a contradiction in the data the sort doesn't try to resolve
 * further than that — it still lands last.
 */
export const sortPrepItems = (items: PrepItem[]): PrepItem[] => {
  const active = printableItems(items).sort(byTotalMinutesThenName);
  const checked = items.filter(i => i.checked && !i.notNeeded).sort(byTotalMinutesThenName);
  const notNeeded = items.filter(i => i.notNeeded).sort(byTotalMinutesThenName);
  return [...active, ...checked, ...notNeeded];
};

/** One line of a printed sheet / prep_history doc — see buildPrintSheet. */
export interface PrintSheetLine {
  name: string;
  spec?: string;
  makeQty: number;
  unit: string;
  activeMinutes: number;
  inactiveMinutes: number;
}

/**
 * The one time string both the checklist row and the printed sheet show,
 * pure so the conditional is unit-tested rather than eyeballed in a print
 * preview. Split only when there is a hold (P-034 ruling 5): a cook
 * reading "340 WAIT" knows to start it and walk away, while
 * "90 ACTIVE / 0 WAIT" on every butchery row is noise on a document whose
 * whole value is that it is scannable mid-shift.
 *
 * Accepts a PrepItem or a PrintSheetLine — the line's required numbers are
 * assignable to the item's optional ones, so the row and the sheet cannot
 * drift into two formats.
 */
export const formatPrepTime = (item: Pick<PrepItem, 'activeMinutes' | 'inactiveMinutes'>): string => {
  const wait = inactiveMinutesValue(item);
  return wait > 0
    ? `${activeMinutesValue(item)} ACTIVE / ${wait} WAIT`
    : `${activeMinutesValue(item)} min`;
};

/**
 * A prep_history line as READ BACK, which is not the shape being written.
 * prep_history is write-once by design, so a doc printed before P-034
 * carries `prepMinutes` and neither new field — exactly the legacy shape
 * ruling 6 refuses to reinterpret. Read history through this, never
 * through PrintSheetLine; same code-level-fallback convention as
 * onHandValue and KitchenEvent.attendees/covers, and for the same reason:
 * no migration write over an archive.
 */
export type StoredPrintSheetLine =
  Omit<PrintSheetLine, 'activeMinutes' | 'inactiveMinutes'> & {
    activeMinutes?: number;
    inactiveMinutes?: number;
    prepMinutes?: number;
  };

/**
 * The shape shared by the printed DOM and the prep_history doc, built
 * on printableItems so the two can never diverge. Ordered the same way
 * the checklist view shows printable items (totalMinutes descending,
 * name tiebreak) — what prints top-to-bottom is what the sheet reads
 * top-to-bottom.
 */
export const buildPrintSheet = (items: PrepItem[]): PrintSheetLine[] =>
  printableItems(items)
    .sort(byTotalMinutesThenName)
    .map((item): PrintSheetLine => ({
      name: item.name,
      ...(item.spec && { spec: item.spec }),
      makeQty: makeQty(item),
      unit: item.unit,
      activeMinutes: activeMinutesValue(item),
      inactiveMinutes: inactiveMinutesValue(item),
    }));
