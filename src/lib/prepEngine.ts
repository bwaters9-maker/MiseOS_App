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

/** Missing prepMinutes reads as 0 — sorts last in the descending sort below, same "absent reads as a stated default" convention as recipeStatus(). */
export const prepMinutesValue = (item: Pick<PrepItem, 'prepMinutes'>): number =>
  item.prepMinutes ?? 0;

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

/** Descending by prepMinutesValue, tiebreak alphabetical by name. Array.prototype.sort is stable, so any remaining tie keeps input order. */
const byPrepMinutesThenName = (a: PrepItem, b: PrepItem): number =>
  prepMinutesValue(b) - prepMinutesValue(a) || a.name.localeCompare(b.name);

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
 * by prepMinutesValue descending, tiebreak name; (2) checked; (3)
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
  const active = printableItems(items).sort(byPrepMinutesThenName);
  const checked = items.filter(i => i.checked && !i.notNeeded).sort(byPrepMinutesThenName);
  const notNeeded = items.filter(i => i.notNeeded).sort(byPrepMinutesThenName);
  return [...active, ...checked, ...notNeeded];
};

/** One line of a printed sheet / prep_history doc — see buildPrintSheet. */
export interface PrintSheetLine {
  name: string;
  spec?: string;
  makeQty: number;
  unit: string;
  prepMinutes: number;
}

/**
 * The shape shared by the printed DOM and the prep_history doc, built
 * on printableItems so the two can never diverge. Ordered the same way
 * the checklist view shows printable items (prepMinutes descending,
 * name tiebreak) — what prints top-to-bottom is what the sheet reads
 * top-to-bottom.
 */
export const buildPrintSheet = (items: PrepItem[]): PrintSheetLine[] =>
  printableItems(items)
    .sort(byPrepMinutesThenName)
    .map((item): PrintSheetLine => ({
      name: item.name,
      ...(item.spec && { spec: item.spec }),
      makeQty: makeQty(item),
      unit: item.unit,
      prepMinutes: prepMinutesValue(item),
    }));
