/**
 * Shared form/control classes for the legacy screens.
 *
 * These five constants were hand-copied byte-identical into eight files
 * (Recipes, Staff, Vendors, Features, EventCalendar, events/EventDetailView,
 * ingredients/InvoicePriceUpdate, AlertDialog) plus a BADGE-only copy in
 * DailyCribSheet. One definition now, so a brand or accessibility change
 * lands once instead of drifting across nine screens.
 *
 * Brand v1.1 tokens only — never a raw hex or a palette name. The screens
 * re-colour for Day/Service through the `data-surface` cascade in index.css;
 * nothing here may branch on the mode.
 *
 * Colour is never the sole carrier of meaning (P-028). BTN_ACTION and
 * BTN_DESTRUCTIVE differ by FILL, not hue: solid versus outline. That
 * distinction survives every colour vision deficiency.
 */

/** Text, name, and prose fields. Body font — mono here would read as a terminal. */
export const INPUT =
  'w-full bg-surface border border-line rounded-card px-[8px] py-[5px] text-xs text-navy font-body focus:outline-none focus:border-teal placeholder-ink-faint';

/**
 * Numerals that are data — prices, quantities, percentages. Mono per the
 * CLAUDE.md typography rule; `tabular-nums` so digits align down a column.
 */
export const INPUT_NUMERIC = `${INPUT} font-mono tabular-nums`;

export const FIELD_LABEL =
  'block text-[10px] font-bold uppercase tracking-wider text-slate font-body mb-[5px]';

/**
 * Primary/confirm. Solid fill is the signal — no icon needed.
 * Teal is the interactive accent; saffron stays reserved for the single
 * per-screen signal element and is never a button colour here.
 */
/* text-cream collided to 2.46:1 on Service teal (P-031 item 1) — cream is
   fixed while teal carries its own independent Day/Service values, and
   Service's lighter teal (#3FA8A0) sits too close to it. text-on-teal fixes
   the resting state: 7.32:1 Day, 5.03:1 Service (see index.css). */
/* Hover history (P-031 items 1-2): originally an alpha step on teal itself
   (hover:bg-teal/85). Two problems surfaced, one after the other — never
   navy-deep, since after P-028 darkened teal to #0B564F (L=0.073), Day's
   navy-deep #145A55 (L=0.081) is isoluminant with it at 1.06:1, an
   invisible swap. First, /85 diluting the background toward whatever's
   behind the button dragged it toward on-teal's own dark Service value,
   collapsing contrast to 3.90-3.99:1 there. Tightening to /95 fixed
   contrast (4.65:1 worst case) but then failed the AFFORDANCE requirement
   instead: CIEDE2000 1.83 vs resting in Service, indistinguishable at
   normal viewing scale — contrast and "does this read as clickable" are
   different requirements, and dilution alone can't satisfy both, since
   teal/on-teal sit on opposite sides of each other's lightness in the two
   surfaces (see index.css's --color-teal-hover comment for why). Final
   fix: teal-hover, a dedicated solid-swap token, independently valued per
   surface — darker in Day (#073F3A, dE2000 7.38 vs resting, 10.10:1 vs
   on-teal), lighter in Service (#5FC0B8, dE2000 7.15 vs resting, 6.68:1 vs
   on-teal). Border moves with the fill so there's no seam. */
export const BTN_ACTION =
  'px-[13px] py-[8px] bg-teal text-on-teal border border-teal rounded-card text-xs font-bold font-display hover:bg-teal-hover hover:border-teal-hover transition-colors duration-[144ms]';

/**
 * Destructive. Outline only — transparent fill, 2px danger border — so it is
 * distinguishable from BTN_ACTION by form alone. Always pair with a leading
 * icon and a verb+object label ("Delete recipe", never "Delete").
 * Never render a filled danger button beside a filled BTN_ACTION.
 */
export const BTN_DESTRUCTIVE =
  'px-[13px] py-[8px] bg-transparent border-2 border-danger text-danger rounded-card text-xs font-bold font-display inline-flex items-center gap-[5px] hover:bg-danger-wash transition-colors duration-[144ms]';

export const BTN_GHOST =
  'px-[13px] py-[8px] bg-surface border border-line text-slate rounded-card text-xs font-bold font-display hover:text-navy transition-colors duration-[144ms]';

export const BADGE =
  'px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold uppercase tracking-wider border border-line';
