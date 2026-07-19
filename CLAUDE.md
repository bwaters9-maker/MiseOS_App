# IncendiumPhi — CLAUDE.md

## What this is

IncendiumPhi ("Culinary Chaos Decoded.") is a restaurant back-of-house management app — working name MiseOS until the Brand v1.1 rename (2026-07-16). It is a single-page React app served by an Express server, with Firebase Firestore as the live database.

## Running the app

```bash
npm run dev      # development — Express + Vite middleware, HMR, http://localhost:3001
npm run build    # production build to ./dist
npm start        # production — Express serves ./dist
```

NODE_ENV must be set to `development` or `production` — the server throws on startup if it isn't.

## Tech stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Vite 6
- **Backend:** Express 4 (serves the SPA and API routes)
- **Database:** Firebase Firestore (live `onSnapshot` listeners throughout)
- **AI:** Anthropic API called server-side from `server.ts` (`POST /api/ai`), proxied to by `TestKitchenHub.tsx`. The browser never sees `ANTHROPIC_API_KEY`.
- **Animation:** Motion (Framer Motion v12)
- **Icons:** Lucide React

## Environment variables

All in `.env` (gitignored). Required keys:

```
NODE_ENV=development
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
ANTHROPIC_API_KEY
```

Firebase config also accepts non-prefixed `FIREBASE_*` keys (see `src/firebaseConfig.ts`).

`ANTHROPIC_API_KEY` must never carry a `VITE_` prefix — Vite embeds `VITE_*` vars into the client bundle, which would ship the key to the browser. It is read only by `server.ts` locally, never imported in `src/`. The deployed Cloud Function (`functions/`) does not read this `.env` at all — it needs `ANTHROPIC_API_KEY` set separately as a Functions secret (`firebase functions:secrets:set ANTHROPIC_API_KEY`) before it can be deployed. See the AI feature section below.

## Project structure

```
server.ts                        Express entry point
functions/                        Deployed Cloud Functions (own package.json/tsconfig, Node 20)
  src/
    aiProxyHandler.ts              Shared /api/ai proxy core — imported by both this and server.ts
    index.ts                       Cloud Function entry points (currently just `ai`)
src/
  main.tsx                       React root
  App.tsx                        View router (viewMap + lazy loading)
  firebaseConfig.ts              Firebase init
  types.ts                       Canonical type definitions
  utils.ts                       Helpers (formatDuration, etc.)

  DailyCribSheet.tsx             Crib Sheet view — five sections, print-optimized
  ChefDashboard.tsx              Chef's Dashboard — the app's landing page/command center: today's schedule w/ station coverage, today's events, quick actions, compact alerts indicator. Read-only.
  Features.tsx                   Nightly specials CRUD — 86 toggle syncs to Crib Sheet live
  Staff.tsx                      Employee directory + shift scheduling — feeds Crib Sheet and Chef's Dashboard (today's shifts only). Shift station select sources from `useStationPresets()` (live, chef-customizable) rather than a hardcoded list — see Chef's Dashboard section. Schedule section carries a List/Calendar toggle (`components/staff/ScheduleCalendar.tsx`) merging shifts with Events — see the Staff Schedule Calendar section below.
  EventCalendar.tsx              Events & Clients — event/client CRUD, grouped by date, upcoming/past split, feeds Crib Sheet; clicking an event opens EventDetailView, which can also be deep-linked into directly via a `selectedEventId` prop (used by the Staff schedule calendar)
  PrepChecklist.tsx              Par-level deficit tracking table
  KitchenTimers.tsx              Multi-station countdown timers (Firestore-backed)
  TestKitchenHub.tsx             Test Kitchen — sub-tabs "Culinary Trends & Forecasts" and "The Menu Development Playground" (calls server-side /api/ai proxy); Playground chat runs on the shared Sous persona (src/lib/sousPersona.ts)
  Settings.tsx                   Theme toggle + station preset CRUD + recipe category CRUD
  HistoricalAlerts.tsx           Alert History view — all alerts, severity/status filters, resolve/reopen toggle (writes `resolved` only)
  IngredientsTable.tsx           Master Pantry — static human-verified ingredient CRUD, unit conversion
  Vendors.tsx                    Vendor directory — supplier contacts, lead time, order days, linked-ingredients view; feeds Ingredient.vendorId
  Recipes.tsx                    Recipe Builder — list (Menu Recipes / Sub-Recipes) + editor + Live Cost Analysis
  Menu.tsx                       Menu view — operational (FC%/cost) table + Guest Preview toggle
  RecipeCollections.tsx          Recipe Collections — seasonal groupings of menu recipes, one active at a time (RecipesHub sub-tab, brand kit)

  components/
    AppHeader.tsx                Nav bar — edit navItems[] to add/remove tabs
    KitchenStateContext.tsx      React context wrapping KitchenStateProvider
    ErrorBoundary.tsx
    AlertDialog.tsx
    CribComponents.tsx           Shared Section wrapper
    GuestMenuPreview.tsx         Guest-facing menu templates (Classic / Clean), print-optimized
    TimerStrip.tsx                App-wide persistent kitchen timer strip — see the Kitchen Timer Strip section below

    ingredients/
      InvoicePriceUpdate.tsx     Photo/PDF invoice → AI-extracted line items → human-confirmed price writes
      AiIngredientLookup.tsx     Name → AI-proposed ingredient → chef-reviewed add (default Add Ingredient path)
      IngredientForm.tsx         Shared form/types/toDoc used by AiIngredientLookup, manual add, and edit

    events/
      EventDetailView.tsx        Event detail: header card (name/type/date/attendees/staff strip) + Timeline, Tentative Menu, Client, Change Log panel grid

    dashboard/
      PrepRegistrationForm.tsx
      TrendSidebar.tsx

    staff/
      ScheduleCalendar.tsx        Week/month schedule calendar — shifts merged with Events, read-only (Staff.tsx's Schedule section, List/Calendar toggle)

  hooks/
    useKitchenState.ts           Firestore listeners for all collections
    useStationPresets.ts         Firestore listener for station_presets collection
    useRecipeCategories.ts       Firestore listener for recipe_categories collection, seeds defaults if empty
    useRecipeCollections.ts      Firestore listener for recipe_collections collection, exposes activeCollection (no seeding)
    useTimers.ts                  Single Firestore listener for the timers collection, lifted to AppShell and shared by KitchenTimers.tsx and TimerStrip.tsx (no duplicate listeners)

  lib/
    costEngine.ts                recipeCost / costPerPortion / fcPercent / suggestedPrice / wouldCreateCycle + computeCostPerBaseUnit
    units.ts                     Canonical unit conversion (g/ml/each base; imperial/metric display)
    regionContext.ts             buildRegionContext / withRegionContext — compact restaurant-profile block injected into /api/ai system prompts
    sousPersona.ts                Sous persona system prompt for the Test Kitchen Playground chat
    seasonalData.ts              Static seasonal produce/protein reference by US region (Test Kitchen's Seasonal Matrix) — no runtime calls, same pattern as yieldReference.ts
    yieldReference.ts            Common product usable-yield percentages, grounds the AI ingredient lookup's yieldPercent proposals
```

## Navigation / routing

There is no router library. Navigation is a `useState` string in `App.tsx`. The `viewMap` object maps view keys to lazy-loaded components. To add a tab:

1. Add a lazy import in `App.tsx`
2. Add an entry to `viewMap` in `App.tsx`
3. Add a `navItems` entry in `src/components/AppHeader.tsx`

Current nav tabs (in order): Dashboard · Staff · Events & Clients · Recipes · Prep List · Alert History · Test Kitchen · Settings

**Recipes** (`view: 'recipes'`, `src/RecipesHub.tsx`) is a merged entry point over three previously-separate top-level views — Recipes, Menu, and Features (nightly specials) — each still its own untouched component with its own internal heading; `RecipesHub` is a thin sub-tab switcher (Recipe Builder / Menu / Features) with no logic of its own beyond keeping the sub-tab in sync with `selectedRecipeId` (so jumping to a specific recipe from Menu or Events & Clients always lands on the Recipe Builder sub-tab).

Features later moved out of `RecipesHub` entirely (Chef's Dashboard split, part two) — `RecipesHub` is now Recipe Builder / Menu / Collections (the Collections sub-tab added with build order item 16, `src/RecipeCollections.tsx`).

The Recipe Builder sub-tab also carries a "View Menu" button (`onViewMenu` prop) that jumps straight to the Menu sub-tab.

**Ingredients** and **Vendors** are no longer top-level tabs — both moved inside Settings (`src/Settings.tsx`) as a General / Ingredients / Vendors sub-tab switcher, rendering the same untouched `IngredientsTable.tsx`/`Vendors.tsx` components. They're reference data edited rarely, so they live behind Settings deliberately.

**Prep List** (`view: 'prep'`) — label only; still `PrepChecklist.tsx`, same par-level deficit table, unchanged.

**Chef's Dashboard split — complete.** `ChefDashboard.tsx` is the landing page/command center: today's schedule with station coverage, today's events, Tonight's Features, quick actions, a compact alerts indicator. Kitchen Timers and Crib Sheet are Quick Action buttons from the Dashboard rather than top-level nav tabs — both keep their `viewMap` keys (`timers`, `dashboard`) so `onNavigate` calls still resolve; only their `navItems` entries were removed. Features management moved the same way: `Features.tsx` keeps its `viewMap` key (`features`, newly added) and is reached via the Dashboard's "Manage Features" link — full edit/delete/86-toggle/schedule-ahead capability is unchanged, just no longer a nav tab or a RecipesHub sub-tab.

**Dashboard's one write exception**: everything else on `ChefDashboard.tsx` is a read-only snapshot. "Add Feature" (a Quick Action) is the sole exception — it creates a new `features` doc, either a manual entry or a one-time snapshot from a picked recipe (`featureFieldsFromRecipe`, `costEngine.ts`). "Tonight's Features" itself has no interactive controls (no inline 86-toggle) — that would be a second write path on a view meant to stay a snapshot; toggling still happens on the full Features view.

**Header layout**: the nav row and header use `flex-wrap` + `min-w-0` on their flex groups (not fixed/implicit min-widths) specifically so nav items never force horizontal page scroll — this was a real bug (confirmed at 1440px) fixed alongside this restructure, not a hypothetical guard.

## Firestore collections

| Collection | Used by |
|---|---|
| `prepItems` | `useKitchenState`, `PrepChecklist` |
| `recipes` | `useKitchenState`, `Recipes.tsx` |
| `features` | `useKitchenState`, `Features`, `DailyCribSheet` |
| `staff` | `useKitchenState`, `Staff.tsx` — employee directory (repurposed from daily roster) |
| `shifts` | `useKitchenState`, `Staff.tsx`, `DailyCribSheet`, `ChefDashboard` — planned shifts, joined to `staff` for display |
| `events` | `useKitchenState`, `EventCalendar`, `DailyCribSheet` — `clientId?` optionally links to `clients`; `attendees` renamed from `covers` (old docs read via a code-level fallback, no data migration) |
| `clients` | `useKitchenState`, `EventCalendar` — catering/events client directory |
| `alerts` | `useKitchenState`, `DailyCribSheet`, `HistoricalAlerts` |
| `crib_notes` | `useKitchenState`, `DailyCribSheet` |
| `timers` | `useTimers` (single listener, lifted to `AppShell`) — consumed by `KitchenTimers.tsx` and `TimerStrip.tsx`, see the Kitchen Timer Strip section below |
| `station_presets` | `useStationPresets` (now actually consumed — by `Staff.tsx`'s shift form and `ChefDashboard.tsx`'s coverage check; previously an orphaned hook), `Settings.tsx` (own inline query, CRUD), `KitchenTimers.tsx` (own inline query, unchanged) |
| `ingredients` | `useKitchenState`, `IngredientsTable.tsx` |
| `vendors` | `useKitchenState`, `Vendors.tsx`, `IngredientsTable.tsx` — `Ingredient.vendorId` optionally links to `vendors`; deleting a vendor clears `vendorId` on every linked ingredient (`deleteField()`) rather than orphaning the reference |
| `restaurant_profile` | `useKitchenState`, `App.tsx`, `Settings.tsx` — singleton doc at the fixed id `main` (not a growing collection); every field optional, missing doc is a valid state |
| `trend_reports` | `useKitchenState`, `TestKitchenHub.tsx` — singleton doc at the fixed id `latest` (not a growing collection); read-only editorial content, written only by the chef-triggered "Refresh Trends" action — see the Test Kitchen Phase B hard boundary below |
| `recipe_categories` | `useRecipeCategories`, `Settings.tsx`, `Recipes.tsx` — seeded with Sides/Sauces/Salads/Soups/Proteins/Desserts if empty |
| `recipe_collections` | `useRecipeCollections`, `RecipeCollections.tsx`, `Menu.tsx` — seasonal menu-recipe groupings; at most one doc has `active: true` (activation is a batch write flipping every doc); not seeded |
| `event_types` | `useEventTypes`, `Settings.tsx`, `EventCalendar` — seeded with Wedding/Private Dining/Buyout/Bridal Shower/Corporate/Celebration of Life/Special Event if empty |

`alerts`: crib sheet shows `resolved === false` only; Alert History shows all.

## Canonical types (`src/types.ts`)

| Type | Description |
|---|---|
| `PrepItem` / `ProductionRun` | Prep checklist task |
| `Recipe` | id, name, recipeType ('sub' \| 'menu'), course, categoryId?, batchYield { qty, measureType }, portions, lines: RecipeLine[], methodSteps, menuPrice?, menuDescription?, updatedAt |
| `RecipeLine` | A recipe component: `{ type: 'ingredient' \| 'recipe', refId, qty, entryUnit?, note? }`. `qty` is always canonical base units. `entryUnit: 'each'` marks a line the chef entered by piece on a spec'd weight ingredient (qty stores pieces × pieceWeightG; spec'd ingredients default to 'each' when added and offer it in the unit select). Only `recipeType: 'sub'` recipes may be referenced as a line — menu recipes never nest |
| `PrepStation` | `'Sauté' \| 'Grill' \| 'Garde Manger' \| 'Pastry'` |
| `Feature` | Nightly special (course, name, description, price, cost, activeFrom, activeTo, is86d, recipeId?) — `recipeId` is provenance only; name/description/price/cost are a one-time snapshot copied from the recipe at creation, never re-synced |
| `Employee` | Directory entry: id, name, positions: string[], hourlyRate?, active |
| `Shift` | Planned shift: id, staffId (→ Employee), date, startTime, endTime, station?: PrepStation, note? |
| `EventTypePreset` | Chef-managed event type (id, name), CRUD'd from Settings the same way as `RecipeCategory` — `KitchenEvent.eventType` stores the name directly, no id reference |
| `Client` | Catering/events client: id, name, contactName, phone, email, flagNote? — `flagNote` renders as a persistent amber flag line on the client's directory card |
| `EventMilestone` | Day-of timeline entry on an event: `{ time, label }` — `time` is an `HH:MM` string, list is sorted by time for display |
| `TentativeMenuLine` | Tentative menu line on an event: `{ course, text, recipeId? }` — `text` is the display label either way (free-typed, or the linked recipe's name); `recipeId` optionally points at a `recipeType: 'menu'` recipe for cost projection |
| `EventChangeLogEntry` | Append-only change log entry on an event: `{ date, text }` — entries are never edited or deleted once written, either manually logged by the chef or auto-appended when attendees changes or a tentative menu line is added/removed/swapped |
| `KitchenEvent` | Event (title, date, time, attendees?, notes?, eventType?: string, clientId?: string → Client, milestones?: EventMilestone[], tentativeMenu?: TentativeMenuLine[], changeLog?: EventChangeLogEntry[]) |
| `KitchenAlert` | Alert (message, severity, resolved, timestamp) |
| `CribNote` | Freeform crib note (date, content, author) |
| `KitchenTimer` | Countdown timer |
| `TrendCard` | One editorial trend card in Test Kitchen's Culinary Trends & Forecasts: `{ headline, description, category, isViralBridge? }` — AI-generated per refresh, never auto-fetched |
| `PricingTrendItem` | One line of AI pricing commentary: `{ item, direction: 'up' \| 'down', movement: 'short-term' \| 'structural', note }` — informational only, never linked to a real `Ingredient` |
| `TrendReport` | Singleton doc at `trend_reports/latest`: `{ generatedAt, cards: TrendCard[], pricingTrends: PricingTrendItem[] }` — replaces an old, unused `recipe_scores`-shaped type left over from an orphaned Base44 script that wrote to the same collection name but was never wired into the app (deleted, see Orphaned files below) |
| `Ingredient` | Master Pantry item: name, category, measureType, purchaseUnit, purchaseCost, purchaseQty, yieldPercent, pieceWeightG? (ordered portion spec in grams for portioned weight product, e.g. 6 oz breasts — drives piece-true costing in costEngine [cost ÷ floor(pack/spec) pieces, shortfall treated as unusable pack-out], pieces-per-case, cost-per-piece, and each-yield derivation in the Recipe Builder; absent for bulk/randoms), nutritionPer100g?, allergens?, vendorId?, lastVerified, priceSource, nutritionSource? ('ai' \| 'manual') |
| `RecipeCategory` | Chef-managed recipe category (id, name), CRUD'd from Settings — referenced by `Recipe.categoryId` |
| `RecipeCollection` | Seasonal grouping of menu recipes: id, name, recipeIds: string[], active. One active at a time; when active it defines the menu set (see the Recipe Collections section). Stale recipeIds (deleted recipes) are ignored at read time |
| `IngredientCategory` | `'Produce' \| 'Protein' \| 'Dairy' \| 'Dry Goods' \| 'Frozen' \| 'Beverage' \| 'Other'` |
| `MeasureType` | `'weight' \| 'volume' \| 'each'` — determines base unit (g, ml, each) |
| `Allergen` | FDA Big-9 plus two kitchen-tracked extras: `'milk' \| 'eggs' \| 'fish' \| 'shellfish' \| 'treeNuts' \| 'peanuts' \| 'wheat' \| 'soybeans' \| 'sesame' \| 'gluten' \| 'sulfites'` — gluten/sulfites are tracked app-wide but are NOT FALCPA major allergens; the FDA label's "Contains:" line must render Big-9 only, with gluten/sulfites surfaced as a separate advisory note |
| `NutritionPer100g` | Optional nutrition facts stored per 100g on each Ingredient |
| `PriceSource` | `'regional-estimate' \| 'invoice' \| 'manual'` — provenance of an `Ingredient`'s `purchaseCost`, paired with `lastVerified` |
| `MenuTemplate` | `'classic' \| 'clean'` — Guest Preview styling choice on the Menu view, persisted on `RestaurantProfile.menuTemplate` (migrated from an earlier App.tsx + localStorage scheme) |
| `Vendor` | Master Pantry supplier: id, name, contactName?, phone?, email?, accountNumber?, leadTimeDays?, orderDays?: Weekday[], notes? — CRUD'd from `Vendors.tsx`, referenced by `Ingredient.vendorId` |
| `Weekday` | `'Monday' \| 'Tuesday' \| 'Wednesday' \| 'Thursday' \| 'Friday' \| 'Saturday' \| 'Sunday'` — used for `Vendor.orderDays`, a structured multi-select rather than free text |
| `CuisineStyle` | Fixed union (American, Italian, French, Mexican, Asian, Mediterranean, Steakhouse, Seafood, Farm-to-Table, BBQ, Pizza, Bakery/Café, Fusion, Other) — `RestaurantProfile.cuisineStyle` |
| `PricePoint` | `'$' \| '$$' \| '$$$' \| '$$$$'` — `RestaurantProfile.pricePoint` |
| `RestaurantProfile` | Singleton doc at `restaurant_profile/main`: name?, chefName?, brandColor?, cuisineStyle?, pricePoint?, city?, state?, regionalNotes?, targetFcPercent?, menuTemplate? — every field optional, edited from Settings' Restaurant Profile section. `regionalNotes` is free text by design (chef commentary on local ingredients/traditions); `state` is a plain string (USPS code) rather than a union, UI-constrained to a fixed select. `targetFcPercent`/`menuTemplate` were migrated here from App.tsx state + localStorage — see the Restaurant Profile section below |

Note: `useKitchenState.ts` also defines `PrepItem` locally (pre-existing duplication). `Recipe` was de-duplicated — `useKitchenState.ts` now imports the canonical type from `src/types.ts` directly. New types belong in `src/types.ts` only.

## Design system

**Brand v1.1 (IncendiumPhi)** — one token system, two surfaces: **Day** (default, light) and **Service** (dark, `data-surface="service"` on `<html>`, toggled from Settings' Surface card, state lives in `App.tsx`'s `AppShell`). Tokens defined as a Tailwind v4 `@theme` block in `src/index.css`, mirrored in `design-tokens.json`'s `colors` and `border-radius` sections. Migration source: a Claude Design project (`Migration Spec.dc.html`, imported 2026-07-16) — see the Brand v1.1 migration status note below for what's actually landed vs. still pending.

- **Background:** `bg-bg-cool` (page — cream Day / navy-black Service), `bg-surface` (cards/panels — white Day / raised-dark Service)
- **Borders:** `border-line`
- **Text:** `text-navy` primary ink (navy Day / cream Service — flips per surface via the token cascade, component code never branches on the mode), `text-slate` muted
- **Accent:** `text-teal` / `bg-teal` — interactive only (links, active nav, selected states). Never decorative, never for headings.
- **Signal:** `text-saffron` / `bg-saffron` — the one thing that wants attention per view (primary CTA, warnings, "needs review"). Max one saffron element per screen.
- **Danger:** `text-danger` / `bg-danger-wash` tokens now exist (destructive actions + active alerts only); legacy `red-400`/`red-950` usages are unchanged pending each screen's own migration pass
- **Font:** `font-display` (Archivo, weights 600–800 — headings/nav/buttons), `font-body` (Source Sans 3 — everything else), `font-mono` (IBM Plex Mono — **every numeral that is data**: prices, unit costs, quantities, percentages, timers, times, counts; numerals inside prose stay in body)
- **Cards:** `bg-surface border border-line rounded-card`
- **Radius:** `rounded-card` (12px, was 22px). `rounded-tile` (28px) is **deprecated** — the new spec has no tile radius; kept defined only because `TestKitchenHub.tsx`'s sub-tab switcher still consumes it pending that screen's own migration, at which point delete the token.
- **Wordmark:** the Study-A master lockup — `font-display` weight 800, `tracking-[-0.02em]`, "Incendium" in `text-saffron-text` + "Phi" in `text-navy`, no space, both halves identical size. Built with real Tailwind classes in `AppHeader.tsx`/`SignIn.tsx`, not copied as a one-off. Minimum width 120px; below that, drop the slogan ("Culinary Chaos Decoded.") — this is why the compact nav badge carries no tagline. See `public/brand/` below for the mark SVGs.
- **Spacing:** Fibonacci-based tokens from `design-tokens.json` — use as Tailwind arbitrary values (`p-[21px]`, `gap-[34px]`, etc.)
- No emojis. No comments explaining what code does. No exclamation marks, no "oops"-style error voice, no instructional/congratulatory tone — the user is a professional; the app states, it does not teach out loud.
- No open free-text inputs except names, comments, and special requests — all
  other values come from structured selects, ideally user-customizable lists.

**Brand v1.1 migration status (2026-07-16)** — infra landed in one pass; per-screen migration is separate follow-up work, not yet started beyond what was already brand-kit v1.0:
- **Done:** token system (colors/fonts/radii) rewritten in `src/index.css`/`design-tokens.json`; Google Fonts swapped in `index.html`; Day/Service surface toggle wired end-to-end (`App.tsx` state → `data-surface` attribute → CSS cascade → Settings' Surface toggle) — every already-brand-kit-v1.0 screen re-colors correctly under Service mode automatically, with zero component-level changes, because those screens only ever referenced tokens; full product rename MiseOS → **IncendiumPhi** across all live code, docs, and config (slogan: "Culinary Chaos Decoded."); new Φ mark SVGs live at `public/brand/` (`phi-primary.svg` currentColor, `phi-tile.svg` app-icon/nav-badge, `phi-favicon.svg`, `phi-flame.svg` + `phi-flame-mono.svg` expressive-only ≥64px) — copied verbatim from the design project, never hand-redrawn; `AppHeader.tsx`/`SignIn.tsx` carry the new mark + Study-A wordmark lockup, replacing the old navy "M" square + "MISEOS"/"The Pass"/"System Operator Matrix" badge (that badge/tagline combo is retired — not part of any sanctioned lockup in the spec).
- **Known compliance gaps on already-brand-kit screens** (token values are correct; component-level rules from the spec are not yet applied, since that requires per-component judgment calls the infra pass deliberately didn't make): `ChefDashboard.tsx`'s two solid `bg-navy` CTA buttons (Kitchen Timers quick action, Add Feature submit) don't yet follow the new "primary = saffron bg + navy text" button rule, and their `hover:bg-navy-deep` now resolves to a dark-teal accent hover rather than a darker navy (visually slightly off, not broken); rainbow category-badge treatments, cost-delta color rules (never green), and full numeral→`font-mono` scoping haven't been swept on these screens.
- **Not started:** the ~24-screen legacy dark-zinc migration (unchanged list below) — those screens keep their existing `zinc-`/`emerald-` Tailwind classes untouched; the rename pass touched their strings only (e.g. `ErrorBoundary.tsx`'s crash-recovery copy) without retheming them, so they remain visually on the old dark-zinc aesthetic until their own pass.
- ~~Test Kitchen — Culinary Trends & Forecasts~~ ✓ (Phase B) — brand kit throughout: `bg-surface` cards, navy/slate text, saffron only as signal (Viral Bridge badge, category tags, seasonal "prime" highlight). The Menu Development Playground sub-tab is also on brand kit already (confirmed 2026-07-16: zero `zinc`/`slate`/`gray` classes anywhere in `TestKitchenHub.tsx`; the studio-layout redesign in `7d244ff` moved it onto `bg-surface`/`text-navy`/`text-slate`/`border-line` tokens) — this was previously mis-documented here as "dark-zinc" and pending. Note the Playground's Plate Design and Ingredient Palette panels are themed but still explicit placeholders ("...will be embedded here in a later phase") — a functional-completeness gap, not a theming one.
- ~~Alert History~~ ✓ — rebuilt from placeholder into the real view (live `alerts` from kitchen state, severity + active/resolved filters, resolve/reopen writes) directly on the brand kit: `bg-surface` card, navy/slate text, navy filter pills, saffron as the warning signal, red-400 kept for critical per the kit's unchanged danger color.
- Pending: Daily Crib Sheet, Features, Staff, Events & Clients, Ingredients (Master Pantry), Vendors, Recipes, Prep Checklist, Kitchen Timers, Settings, Menu.

## Invoice Price Update (components/ingredients/InvoicePriceUpdate.tsx)

Opened as a modal from `IngredientsTable.tsx`. Every write is chef-confirmed — nothing is applied automatically, per the Master Pantry Mandate.

- Chef uploads or photographs an invoice (image or PDF); nothing is stored — the file goes to the `/api/ai` proxy for extraction only, never saved. The AI returns `{ vendor, invoiceDate, items: [{ name, packCost, packDescription }] }`, food/beverage line items only (fees, tax, and surcharges are excluded by the extraction prompt).
- **Matching**: each extracted line is matched against the Master Pantry by exact name after normalization (lowercase, punctuation stripped, whitespace collapsed). Containment matches (e.g. "Yuzu Kosho" containing "Yuzu") are deliberately never auto-matched — false positives there are worse than requiring a manual pick from the ingredient dropdown.
- **Blank-cost guard**: a row can only be accepted/applied if it has a matched ingredient AND a parsed cost > 0 (`isEligibleRow`). The accept checkbox is disabled otherwise.
- **Pack-size mismatch guard**: `packSizeMismatch` parses both the pantry's stored `purchaseUnit` and the invoice's `packDescription` into a quantity + unit family (weight/volume/count) and flags a warning icon if the families differ or the ratio is outside 0.7–1.3. This is a warning only — it never auto-converts or blocks acceptance.
- **Apply**: only checked, eligible rows are written on "Apply" — each becomes an `updateDoc` setting `purchaseCost`, `priceSource: 'invoice'`, and `lastVerified` to today. Unchecked or ineligible rows are left untouched.
- **Add-unmatched-to-pantry**: invoice lines with no pantry match get a second, non-fatal AI pass suggesting a clean name/category/measureType/pack size/yield%/allergens for a net-new ingredient. The chef reviews/edits the suggestion in an inline form (`canConfirmAdd` requires name, category, qty, and cost) before "Confirm & Add to Pantry" runs an `addDoc` with `priceSource: 'invoice'` and `lastVerified: today`.

## AI-Guided Ingredient Entry (components/ingredients/AiIngredientLookup.tsx)

The default path when the chef clicks "Add Ingredient" in `IngredientsTable.tsx` — same AI-proposes/chef-confirms pattern as everything else. Shared form logic (types, `toDoc`/`toProposalDoc`, `IngredientForm`, `NutritionAllergenSection`) lives in `components/ingredients/IngredientForm.tsx` so this flow and the plain manual/edit paths never duplicate the form.

- Chef types only a name and hits "Look Up"; one `/api/ai` call returns `{ cleanName, category, measureType, purchaseUnit, packQtyInBaseUnits, baseUnit, estimatedPackCost, yieldPercent, allergens, nutritionPer100g }`, constrained to the same canonical unions as the invoice add-to-pantry prompt.
- The proposal renders as a pre-filled, fully editable `IngredientForm` (`costEstimateBadge`) with an "Estimate" badge on the cost field. Saving unedited sets `priceSource: 'regional-estimate'` and `lastVerified: ''` (the existing unverified-dot convention); editing the cost field before saving counts as verification — `priceSource: 'manual'`, `lastVerified` today (`toProposalDoc`).
- Nutrition and allergens auto-fill from the proposal and stay editable. `nutritionSource: 'ai'` is stamped whenever nutrition data is present, so the future FDA label feature knows it's AI-estimated, not chef-verified.
- "Enter manually instead" (or a failed lookup) drops to the plain blank `IngredientForm` with `showManualCaution` — a persistent warning that small pack-size/yield errors compound into large costing errors. The same `showManualCaution` flag renders on every edit of an existing ingredient, since editing pack/yield carries the same risk. Manual/edit saves always stamp `priceSource: 'manual'`, `lastVerified` today, and `nutritionSource: 'manual'` (`toDoc`) — unconditionally, regardless of which fields were actually touched, matching the pre-existing edit behavior.

## Recipe Builder (Recipes.tsx)

Left panel is the recipe library: a name search (filters as you type), an "Add New Recipe" button (creates a menu-type recipe — the common case) with a smaller "+ Add Sub-Recipe Instead" link beneath it for the less common case, then recipes grouped by `recipeType` first (Menu Recipes, then Sub-Recipes), and within Menu Recipes, sub-grouped by resolved category label. A "View Menu" button in the page header jumps to the Menu sub-tab (`onViewMenu` prop, wired by `RecipesHub`). Selecting or creating a recipe opens the editor on the golden split from `design-tokens.json` (61.8% editor / 38.2% Live Cost Analysis panel).

- **Recipe categories** (`recipe_categories` collection, CRUD'd from Settings, same pattern as station presets) replace the old free-text `course` field with a `categoryId` select in the editor — applies to both menu and sub-recipes. `Recipe.course` is kept in sync with the chosen category's name as a denormalized fallback. Recipes saved before categories existed (or whose category was later deleted) display as `"{course} (uncategorized)"` in the list until re-saved with a real category.
- Filter chips (All + one per category) sit above the recipe list and filter both the Menu Recipes and Sub-Recipes groups, stacking with the existing name search.
- The ingredient/sub-recipe line search box in the editor has its own category chip row to filter sub-recipe results (e.g. pull up all Sauces) independent of the list pane's filter; typing a name and picking a category combine.

- **Menu recipes** (`recipeType: 'menu'`) are finished, sellable plates — the cost panel shows batch cost, cost/portion, an editable menu price, and FC% (color-coded against the `targetFcPercent` Settings value: emerald ≤ target, amber ≤ target+5, red above) plus a suggested price at target FC%.
- **On Menu toggle**: each Menu Recipe row in the library carries an "On Menu"/"Off Menu" badge — independent of `recipeType`, it's whether this finished recipe is *currently* offered. Clicking it writes `onMenu: boolean` directly to that recipe's document (`updateDoc`), no editor/save step involved. Sub-recipe rows never show this toggle — they have no menuPrice or guest description and were never eligible for the menu. `isRecipeOnMenu` (`costEngine.ts`) is the single source of truth read everywhere this matters: `recipe.recipeType === 'menu' && (recipe.onMenu ?? true)` — the `?? true` default means every recipe saved before this field existed keeps appearing on the menu exactly as before, until a chef explicitly toggles it off. No bulk migration was run or needed.
- **Sub-recipes** (`recipeType: 'sub'`) are component preparations (stocks, sauces, prep) — no menu price or FC%; the cost panel shows only batch cost and cost per canonical base unit of the batch yield.
- Only `recipeType: 'sub'` recipes are selectable as a `RecipeLine` inside another recipe's ingredient list — menu recipes never nest. The line search box still shows a blocked candidate (self-reference or one that would create a cycle) disabled with a "Circular reference" badge, rather than hiding it.
- Cost math lives in `src/lib/costEngine.ts`: `recipeCost` recurses through sub-recipe lines with cycle detection (throws a descriptive error if a cycle is ever hit despite the UI block), `costPerPortion`, `fcPercent`, and `suggestedPrice` are pure functions built on top of it.
- The batch scale control (×0.5 / ×2 / custom) only scales the numbers displayed in the cost panel — it never mutates the stored recipe.
- `targetFcPercent` (default 30) is a global setting owned by `RestaurantProfile.targetFcPercent` (migrated from an earlier App.tsx state + localStorage scheme — see the Restaurant Profile section below), editable in Settings under "Recipe Costing". App.tsx still surfaces it as a `targetFcPercent`/`setTargetFcPercent` prop pair, so `Recipes.tsx` and `Settings.tsx`'s "Recipe Costing" card are unchanged — only the storage underneath moved.

## Menu View (Menu.tsx)

Two modes on one screen, toggled by the "Guest Preview" button — no separate nav tab.

- **Operational** (default): the read-only cost/FC% table described above in the Approved Feature Map's MENU entry — name, menu price, cost/portion, FC%, grouped by category. Which recipes appear is driven entirely by `isRecipeOnMenu` (`costEngine.ts`), toggled from the Recipes library — Menu.tsx has no composition mechanism of its own, one source of truth.
- **Guest Preview**: `components/GuestMenuPreview.tsx` renders what the customer sees — recipe name, `menuDescription`, `menuPrice`, grouped by category — with cost/FC% data entirely absent. Only menu recipes with a `menuPrice > 0` are listed; unpriced items are silently omitted (a guest menu never shows a blank price). Categories that resolve to no priced items are omitted; the internal "Uncategorized" fallback label is never shown here.
- **Templates**: a Classic/Clean picker in the Guest Preview toolbar selects between two fixed, print-ready visual styles (cream/serif/two-column vs. white/single-column with dotted price leaders). Both are data-only styling choices — same `guestGroups` derivation feeds either one. A consumer advisory line ("Consuming raw or undercooked meat...") is a fixed footer in both templates, not tied to any data field.
- Template choice is `menuTemplate` (`'classic' | 'clean'`, type in `src/types.ts`), owned by `RestaurantProfile.menuTemplate` (default `'clean'` when unset) — App.tsx still surfaces it as a `menuTemplate`/`setMenuTemplate` prop pair, so this file and `Menu.tsx` are otherwise unchanged. Both templates render the restaurant name from `RestaurantProfile.name` in the header when set, falling back to the generic "Menu" header when the profile is blank — a guest menu never shows a fabricated name.
- Print: both templates carry their own `@media print` rules (page size/margins, hides app chrome and the toolbar, forces background-color printing via `print-color-adjust`). The Classic template's two-column layout uses CSS `column-count`, which also paginates correctly across printed pages.

## Recipe Collections (RecipeCollections.tsx)

Build order item 16, part 1 (Sharing is part 2, not yet designed — it needs a public-read security-rules discussion first and is deliberately deferred). A Collections sub-tab in RecipesHub, built directly on the brand kit (`bg-surface` cards, navy/slate, teal accent, saffron as signal).

- A collection is a named set of menu recipes (`recipe_collections`, see the Firestore table). Cards expand to a checklist picker of all menu recipes; membership toggles write `recipeIds` directly. Two-step delete, same convention as Vendors/Staff.
- **At most one collection is active.** Activate runs a single `writeBatch` setting `active: c.id === target.id` across every doc — no window where two are active. Deactivate is a plain single-doc update.
- **Active collection defines the menu**: `isRecipeOnMenu(recipe, activeCollection?)` (costEngine.ts) — when an active collection is passed, the recipe must be a member AND pass its own `onMenu` toggle, so the toggle survives as a one-off off-switch within the season (a member with the toggle off shows a saffron "Off Menu toggle" note in the picker). With no active collection (or the argument omitted), behavior is exactly the pre-collections rule — every existing caller is unchanged. `Menu.tsx` is the only caller passing it, and shows an "Active collection: {name}" line under the header while one is active.
- The Recipes library's On Menu badge deliberately still reflects only the recipe's own toggle, not collection membership — the Menu view is where the collection filter is visible. Revisit if this misleads in practice.

## Chef's Dashboard (ChefDashboard.tsx)

The app's landing page and command center — default view on sign-in (`view: 'dashboard-home'`, first nav position, labeled "Dashboard"). Today only; read-only with one deliberate exception (Add Feature — see below), purely a snapshot derived from `useKitchenState`. Crib Sheet remains a separate, unchanged top-level view (`view: 'dashboard'`, reached only via the Quick Actions button now, not the nav) — the two will diverge further once Crib Sheet becomes print-only.

- **Today's Schedule**: every configured station preset (`useStationPresets()`) renders as its own row — covered stations show the assigned employee(s) and times, an uncovered station (no shift assigned today) shows a bold red "Uncovered" badge. Shifts with no station assigned surface separately underneath, never silently dropped. A plain one-line summary ("No shifts scheduled today" / "N shifts today") sits above the breakdown so the zero-shift case is stated outright, not just implied by an all-uncovered list.
- **Fixed a real bug while wiring this up**: `Staff.tsx`'s shift form previously sourced station options from its own hardcoded array (`['Sauté', 'Grill', 'Garde Manger', 'Pastry']`), completely ignoring the customizable `station_presets` collection — a chef who renamed or added a station in Settings could never actually assign a shift to it. `useStationPresets()` (previously an unused/orphaned hook) is now the single source of truth for both the shift form's options and the dashboard's coverage check — same one-source-of-truth principle as `isRecipeOnMenu`. The hook now falls back to the 4 original names only when `station_presets` is empty, matching the fallback `KitchenTimers.tsx` already had inline. Existing shifts keep whatever station string they were saved with regardless of later renames — there's no live join, just a stored string, same "survives until re-saved" convention as a deleted recipe category.
- **Today's Events**: today's events from `useKitchenState`'s `events`, resolved against `clients` for display name (same `clientsById` map pattern as `EventCalendar.tsx`). No events = plain empty state.
- **Tonight's Features**: read-only list of today's active (not 86'd, within `activeFrom`/`activeTo`) features — the exact same filter `DailyCribSheet.tsx`'s own "Features Tonight" card uses. No inline 86-toggle here (see the write-exception note above); a "Manage Features" link navigates to the full `Features.tsx` view for that.
- **Quick Actions**: buttons to Kitchen Timers and Crib Sheet (`onNavigate`, threaded down from `App.tsx`'s `setActiveView`), plus "Add Feature" — opens an inline form (Manual Entry or From Recipe) that writes a new `features` doc via the shared `toDoc`/`FormState`/`BLANK` exported from `Features.tsx`, so the write shape can never drift between the two entry points.
- **Alerts indicator**: a compact icon+count in the header, not a full card — links to Alert History. Red when there's at least one active (unresolved) alert, neutral otherwise.
- Today's date is computed via the shared `todayDateKey()` helper (`src/utils.ts`) — see the app-wide date/time convention below.

## Kitchen Timer Strip (TimerStrip.tsx)

A persistent, app-wide indicator for running/expired kitchen timers, visible from every view — not just the Kitchen Timers screen itself (reached from `ChefDashboard.tsx`'s Kitchen Timers Quick Action, unchanged, for full CRUD). The strip itself is read-only display + alerting; no timer CRUD changed for this feature.

- **Single shared listener**: `src/hooks/useTimers.ts` (matches the `useStationPresets`/`useRecipeCategories` one-hook-per-collection convention) owns the one `onSnapshot` on the `timers` collection. Called once in `AppShell` (`App.tsx`) and prop-drilled as `timers` to both `KitchenTimers.tsx` and `TimerStrip.tsx` — the same pattern already used for `theme`/`unitSystem`/etc. `KitchenTimers.tsx` no longer runs its own listener; its CRUD functions (`addTimer`/`deleteTimer`/`toggleTimer`/`resetTimer`/`adjustTimerDuration`) are unchanged.
- **Placement**: `TimerStrip` sits between `AppHeader` and `<main>` in `AppShell`'s flex column — outside `<main>`'s scroll region, so no `position: sticky` is needed (avoids the sticky-offset-stacking problem a variable-height, wrapping header would otherwise create).
- **Visibility**: renders whenever at least one timer has `status: 'running'`, OR at least one timer is expired and not yet acknowledged — the second clause matters because pausing an already-expired timer (a real, pre-existing action) must not silently drop the alarm flag just because it's no longer "running." Otherwise renders `null` — zero DOM, no persistent empty-state chrome, same convention as the header's compact alerts indicator.
- **Saffron is reserved for the expired/alarm state only**, per the brand kit's signal-color rule — running, non-expired timers render in navy/slate/border-line. An expired timer gets a saffron border/background, saffron text, a bouncing bell icon, and a one-tap acknowledge button. Acknowledging silences the alarm and drops the saffron treatment, but the chip stays visible if the timer is still `status: 'running'` past its duration — acknowledge silences, it does not stop the timer.
- **Acknowledged state is ephemeral and client-only** — an in-memory `Set<string>` of timer IDs local to `TimerStrip`, never written to Firestore. An id drops automatically once its timer is no longer expired (reset, restarted) or no longer exists (deleted), so re-arming a timer doesn't require a separate un-acknowledge step. It resets on page reload by design — silence is an in-session dismissal, not a persisted preference, so an already-expired timer alarms again after a fresh load.
- **Audio**: Web Audio API (`AudioContext` + oscillator, no bundled audio asset), repeating every 1200ms while anything is expired-and-unacknowledged. Autoplay policy requires a prior user gesture — the strip arms one shared `AudioContext` on the first `pointerdown`/`keydown` anywhere in the app, then never again. If a timer is already expired before that first gesture, the alarm is silently blocked until the gesture lands, then plays immediately as part of arming rather than waiting on the next Firestore change. The visual saffron flag is unaffected by arming state — only audio is gated.
- **Print**: the strip's root carries the existing global `.no-print` utility class (`index.css`, inside the page-level `@media print` block) — this suppresses it under any printable view (Crib Sheet, Guest Menu Preview, and any future one) automatically, without each view needing its own rule.
- **Bug found and fixed during this work**: `KitchenTimers.tsx`'s `toggleTimer`/`resetTimer` previously wrote `startTime: undefined` via `updateDoc()`, which Firestore rejects outright (`Unsupported field value: undefined`) — Pause and Reset were silently failing entirely, with the exception only visible in the console. Fixed to use `deleteField()`, the same pattern already used elsewhere in this codebase (e.g. clearing `Ingredient.vendorId` on vendor deletion).

## Vendor Management (Vendors.tsx)

Directory CRUD with the same collapsible-add-form / inline-edit / two-step-delete pattern as Staff and Events & Clients — no separate detail page.

- A vendor card shows name, contact, lead time, order days, and notes. Clicking the "N linked ingredients" row (same expand pattern as the client event-history list in Events & Clients) reveals every ingredient with that `vendorId` — name, category, `lastVerified` (or "Unverified"), and `priceSource` badge.
- `orderDays` is a structured multi-select of `Weekday` toggle chips, not free text, per the no-open-text-inputs principle.
- Deleting a vendor with linked ingredients requires the two-step confirm to state the count ("Will unlink N ingredients"); confirming clears `vendorId` via `deleteField()` on every linked ingredient before deleting the vendor doc — a reference is never left orphaned.
- Master Pantry link: the shared `IngredientForm` (`components/ingredients/IngredientForm.tsx`) takes a `vendors` prop and renders a Vendor select (plus "— None —") next to Name/Category — used by the default Add Ingredient path, the AI-lookup review/manual stages, and the edit form. The Master Pantry table resolves and displays the vendor name from `vendorId`. Nothing is seeded — the generic-placeholder-vendors idea from the Approved Feature Map is an onboarding-time feature, not part of this build.
- `InvoicePriceUpdate.tsx`'s inline add-unmatched-to-pantry form is a separate, minimal form (not the shared `IngredientForm`) and intentionally doesn't get a vendor field in this pass.

## Test Kitchen — Culinary Trends & Forecasts (TestKitchenHub.tsx, Phase B)

> **Hard boundary:** trends content is editorial and read-only — it informs the chef and NEVER writes to the pantry, costing, or any other data. It is not a live market-data feed. Refresh now runs automatically on a weekly cadence (see Persistence & weekly cadence below) rather than requiring an explicit chef click — but the boundary against touching any other domain data holds regardless of what triggers a refresh.

- **Editorial cards** (section heading: "This Week's Culinary Trends for {date}", local time, date-only): the refresh pipeline (see Persistence & weekly cadence below — no manual button) runs a two-pass draft-then-verify flow. **Draft pass**: one `/api/ai` call (`TRENDS_SYSTEM_PROMPT`, region context injected via `withRegionContext`) asks for 6 cards as structured JSON — 5 genuine high-end/fine-dining trend cards (technique, sourcing, format, flavor — not social-media volume) plus exactly 1 "Viral Bridge" card, distinctly labeled, framing the single most significant viral/popular trend as an opportunity to build a credible elevated version. `normalizeTrendResponse` enforces the exactly-one-bridge invariant client-side rather than trusting the model — if the AI returns zero or multiple, it's coerced deterministically. **Verify pass**: each drafted card gets its own follow-up `/api/ai` call with the `web_search` tool (same pattern as the Ingredient Advisor), asking the model to find real coverage supporting that specific claim. `sourceUrl`/`sourceName` come only from the API's own search citations — never model-written text, since a hallucinated URL is worse than none. A drafted card with no supporting citation is dropped entirely; the report may ship with fewer than 6 cards, even zero — the feature never pads back in an unverified trend to hit a count. One refresh therefore costs 1 draft call plus up to 6 verify calls (7 total), each verify call additionally billing web-search fees on top of tokens. A card with a real `sourceUrl` links to it directly, labeled with `sourceName`; the Google-search fallback (`https://www.google.com/search?q=<headline>`) only applies if a card somehow lacks one.
- **Pricing Trends**: the same refresh call returns a separate `pricingTrends` JSON block — items running high/low and whether the movement reads short-term or structural. Purely informational, clearly disclaimed as AI commentary, and never cross-referenced to a real `Ingredient` or its `purchaseCost` — the Master Pantry Mandate wall holds here same as everywhere else.
- **Persistence & weekly cadence**: on a successful refresh, the report is written to both the singleton doc `trend_reports/latest` (`useKitchenState`'s `trendReport`/`trendReportLoaded`, read live) and a dated doc `trend_reports/{YYYY-MM-DD}` (the generation date, in local time), so a history of past briefings survives. History is capped at the 12 most recent dated docs — older ones are deleted immediately after each successful write (`pruneTrendHistory`). There is no manual "Refresh Trends" button: when the Trends view loads, a one-time staleness check (guarded by a ref so it can only fire once per mount, never double-triggering) compares `trendReport.generatedAt` against now — if it's missing or older than 7 days, the refresh pipeline runs automatically in the background. The current report stays visible the whole time (never a blank screen), with a subtle "Updating this week's trends…" indicator. A "Previous weeks" dropdown lets the chef browse any of the up-to-12 archived reports read-only — clearly labeled by date, with a persistent banner while viewing one — and never triggers a refresh or write.
- **Seasonal Matrix**: `src/lib/seasonalData.ts` — a static bundled dataset (no runtime calls, same pattern as `yieldReference.ts`) of common produce/proteins with ramp-up/prime/tail-off months across 5 US regions (Northeast, Southeast, Midwest, Southwest, West). Region is derived from `RestaurantProfile.state` via `regionForState` (falls back to Northeast when unset). Default view shows what's in season now plus what's coming up in the next 8 weeks; an expandable full-year calendar table (12-month × item grid, color-coded by status) supports actual menu planning.
- Replaces an old, unused `TrendReport` type shaped around `recipe_scores` and an orphaned Base44-era script (`src/services/analysis/TrendAnalyzer.js`, plus its never-wired-in `TrendSidebar.tsx` consumer) that referenced the same `trend_reports` collection name with an incompatible snake_case schema and a fake Gemini call — both deleted as dead code once the naming collision surfaced.

## AI feature (TestKitchenHub)

The browser never talks to Anthropic directly, and no AI feature ever ships an Anthropic key to the client. Every AI call goes through `POST /api/ai`, and every request to it must carry a Firebase ID token (`Authorization: Bearer <idToken>`) — rejected with 401 if missing or invalid.

`/api/ai` has two runtimes, both wrapping the same shared handler (`functions/src/aiProxyHandler.ts`) so there is one implementation of "verify the token, log the uid, forward to Anthropic," not two that can drift:

- **Local dev**: `server.ts`'s Express route. `initializeApp({ projectId })` at startup is enough for `verifyIdToken()` (a JWT signature check against Google's public keys) — no service account key needed just to run `npm run dev`. `ANTHROPIC_API_KEY` comes from `process.env` (`.env`, never a `VITE_` var).
- **Deployed (Hosting)**: the `ai` Cloud Function (`functions/src/index.ts`), reached via a Firebase Hosting rewrite (`/api/ai` → the function, `firebase.json`). `ANTHROPIC_API_KEY` is a Functions secret (`firebase functions:secrets:set ANTHROPIC_API_KEY`, Secret Manager-backed via `defineSecret`) — never in `.env`, never committed, never client-visible.

Every verified request logs `{ event: 'ai_proxy_request', uid, timestamp }` (Cloud Logging in prod, the local terminal in dev) — logging only, never written to Firestore — so a cost spike can be traced back to a specific account.

Client side: every `/api/ai` caller attaches the token via `getAiAuthHeader()` (`src/lib/ai.ts`) — `callAi()` (the shared helper most callers use) includes it automatically; the few raw-`fetch` callers that need `tools` or multi-turn `messages` (Ingredient Advisor, TestKitchenHub's trend-verify pass and Sous chat) import `getAiAuthHeader()` directly. Any future AI feature must go through one of these, not a new raw `fetch('/api/ai')` with hand-rolled headers.

`TestKitchenHub.tsx` posts `{ system, messages, max_tokens }`; the proxy relays Anthropic's JSON response back verbatim, including its `{ error: { message } }` shape on failure. Model is `claude-sonnet-4-6`, default max 1024 tokens. Neither runtime has Firestore access by design (a dumb proxy) — regional context (below) is composed client-side into `system` before the request goes out, not injected server-side.

The proxy accepts an optional `tools` array, whitelisted to exactly Anthropic's server-side web-search tool (`{ type: 'web_search_20250305', name: 'web_search' }`) — any other tool request is rejected with a 400. Used only by the Ingredient Advisor. Web search bills per-search on top of tokens.

## Ingredient Advisor (components/ingredients/IngredientAdvisor.tsx)

Build order item 13. A read-only, web-search-grounded advisory modal on the Master Pantry view — opened from an "Advisor" header button (blank query) or a per-row compass icon (pre-filled with that ingredient's name).

- One `/api/ai` call per query with the `web_search` tool enabled and `ADVISOR_SYSTEM_PROMPT` (`src/lib/advisorPersona.ts`), region context injected via `withRegionContext`. The response renders as a plain-text brief with three fixed sections — AVAILABILITY, SOURCING, ON MENUS NOW — plus a Sources list built from citation blocks (url + title, deduped), opened in new tabs.
- Hard boundary: purely advisory. Zero writes to any collection; the prompt has no pantry, cost, or vendor data beyond the restaurant profile block. Any price mentioned is disclaimed AI commentary — the Master Pantry Mandate wall holds. A persistent footer disclaimer states this in the UI.
- The modal is built on the brand kit (`bg-surface`, navy/slate, teal accents) while the surrounding Ingredients view is still dark-zinc — same accepted mixed state as Test Kitchen's sub-tabs, pending that view's brand pass.

## Restaurant Profile & Regional Intelligence (Settings.tsx, src/lib/regionContext.ts)

- `RestaurantProfile` lives at the singleton doc `restaurant_profile/main` (not a collection — see the Firestore collections table). Every field is optional; a missing doc is a valid, fully-functional state.
- Settings gains a "Restaurant Profile" card: name, chef name, brand color (native color picker), cuisine style (fixed select), price point ($–$$$$, fixed select), city (free text — a place name, same exception as personal names), state (fixed 50-state + DC select), regional notes (free text by design — chef commentary on local ingredients/traditions, the same allowed exception as comments elsewhere). Logo upload is deferred — the card shows a disabled "Pending — not yet implemented" row rather than a broken control. One local form + explicit "Save Profile" button, matching the add/edit-form-with-Save pattern used elsewhere (Vendors, Staff, Events & Clients) rather than the Settings page's older per-field auto-save style, since auto-saving free text on every keystroke would be excessive Firestore writes. Saving writes every field explicitly, using `deleteField()` for blanked ones (via `setDoc(..., { merge: true })`) so clearing a field in the form actually clears it in Firestore instead of leaving the old value behind.
- `targetFcPercent` and `menuTemplate` also live on this doc (migrated from an earlier `App.tsx` state + `localStorage` scheme) since both are restaurant-identity settings, not per-session UI state — but they keep their existing edit surfaces (Settings' "Recipe Costing" card, the Guest Preview toolbar's Classic/Clean picker) unchanged; only the storage underneath moved. `App.tsx`'s `AppShell` reads `restaurantProfile` via `useKitchenSelector` (which required moving `KitchenStateProvider` to wrap `AppShell` rather than be created inside it), computes `targetFcPercent`/`menuTemplate` with a legacy-localStorage read fallback for pre-migration browsers, and runs a one-time migration effect (guarded by a ref, gated on `restaurantProfileLoaded`) that merges any legacy localStorage values into the doc the first time it loads.
- `src/lib/regionContext.ts` exports `buildRegionContext(profile)` (returns a compact `"Restaurant context:\n..."` block, or `''` if the profile has nothing worth surfacing) and `withRegionContext(basePrompt, profile)` (prepends the block, or returns `basePrompt` unchanged when there's no context — so every AI feature works identically with zero profile data).
- Injected into every `/api/ai` system prompt where it's genuinely relevant: the Sous persona (`TestKitchenHub.tsx` Playground chat), the AI ingredient lookup's price/pack estimate (`AiIngredientLookup.tsx`), the invoice add-unmatched-to-pantry suggestion pass (`InvoicePriceUpdate.tsx`), and both Recipe Builder AI buttons — "Build From Pantry" and "Draft Method" (`Recipes.tsx`). Deliberately **not** injected into `InvoicePriceUpdate.tsx`'s raw invoice line-item extraction prompt — that pass's only job is reading text off a photographed invoice accurately, and region context has no legitimate application there (worse, it risks nudging the model toward region-typical items instead of what's actually printed).

## Staff Schedule Calendar (components/staff/ScheduleCalendar.tsx)

Staff & Scheduling part 2 (Approved Feature Map's "Week/month calendar merged with Events"). Not a new nav tab or sub-tab hub — a List/Calendar toggle on `Staff.tsx`'s existing Schedule section header, same "toggle swaps the view" precedent as `Menu.tsx`'s Guest Preview button, scoped to just that section rather than restructuring the whole page.

- **Read-only derivation, no new collection or writes.** `ScheduleCalendar` takes `shifts`, `staff`, `events`, `clients` (all already-live `useKitchenSelector` reads, the same arrays `ChefDashboard.tsx` uses) and `stationPresets` (`useStationPresets()`) as props, and groups them into per-date maps client-side. `firestore.rules` is unchanged.
- **Week mode**: 7-column grid, Sunday-start, one column per day showing a per-station coverage strip (covered = employee name(s) + time, uncovered = the same red `Uncovered` badge `ChefDashboard.tsx`'s Today's Schedule already uses), a "No Station" group for shifts with no station assigned, and event chips (time, title, resolved client name via the same `clientsById` pattern as `ChefDashboard.tsx`/`EventCalendar.tsx`).
- **Month mode**: compact cells — one dot per configured station (teal = covered, red = uncovered) plus an event count badge; leading/trailing days from adjacent months render dimmed but still carry real data. Clicking any cell expands a day-detail panel below the grid showing the same full week-mode breakdown for that day (`DayContent`, shared between week columns and the expanded panel so the two never duplicate the coverage/event logic).
- **Click-through, no inline edit inside the calendar itself**: clicking a shift chip switches `Staff.tsx` back to List mode and opens that shift in its existing edit form (`startEditShift`) — the calendar never duplicates the shift edit UI. Clicking an event chip deep-links to `EventCalendar.tsx`'s `EventDetailView` via a lifted `selectedEventId`/`setSelectedEventId` pair in `App.tsx` (`onOpenEvent` → `setActiveView('events')`), the same cross-view mechanism `selectedRecipeId` already uses for jumping into the Recipe Builder — `EventCalendar.tsx` syncs `detailEventId` from the incoming prop on mount and clears it on `onBack`, so revisiting Events & Clients later doesn't re-open the same event.
- **Brand kit**: built brand-kit from the start (`bg-surface`, navy/slate, teal accents, saffron reserved for signal only — not used decoratively here) despite living inside the still-dark-zinc `Staff.tsx` — same accepted mixed state as the Ingredient Advisor modal, pending `Staff.tsx`'s own brand pass.
- **Hourly rate / pay projections intentionally omitted** from every calendar chip — shift chips show employee name, time, and station only. The Employees directory above already shows `$/hr`; the Weekly Hours strip below (the final STAFF & SCHEDULING item) is the one place rate-derived numbers were considered, and it omits them too — see below.
- **Date/time convention followed throughout**: `todayDateKey()` for the today highlight in both modes, `formatTime12h()` for every displayed time; all grid math (week/month start, day addition) uses `parseDateKey`/`toDateKey`/`addDays`/`startOfWeek` (`src/utils.ts`, extracted from this file — see the app-wide date/time convention below) plus two month-only helpers (`addMonths`, `startOfMonth`) that stay local since nothing else consumes them yet.
- **A real cross-browser `toLocaleDateString` bug surfaced and was fixed here**: calling it with `{ day: 'numeric', year: 'numeric' }` (day+year, no month) rendered a malformed string in testing (`"2026 (day: 18)"` instead of `"18, 2026"`) — the week-range label now always includes the month, sidestepping that options combination entirely.
- **Weekly Hours strip** — the Approved Feature Map's last STAFF & SCHEDULING item ("per-employee projected weekly hours with overtime flag"), attached to Week mode only (month mode carries no per-employee summary): a chip per employee below the 7-day grid, name + summed hours (one decimal place) across the visible week, alphabetical by name, employees with zero hours that week omitted entirely. Hours sum every shift regardless of navigation direction (past/current/future week) — a projection of the schedule as planned, not a timesheet; there's no time-clock concept anywhere in the app. A flat **40-hr threshold** is the only tier: `hours >= 40` gets the same red `Overtime` badge styling as the `Uncovered` badge elsewhere — no second "approaching" tier. An inactive employee with hours in the visible week still appears, suffixed `(inactive)`, since an already-scheduled shift for a since-deactivated employee shouldn't vanish from the projection (mirrors `DayContent` resolving `staffById` regardless of `active`). No `hourlyRate`/pay figure is shown — deliberately narrower than the Feature Map technically permits (scheduler-view-only), scoped to what the item actually asked for. Overnight shifts and week-boundary-spanning shifts are non-issues by construction: `isShiftValid` (`Staff.tsx`) requires same-day `endTime > startTime` on every saved shift, so no shift can wrap past midnight or span two calendar weeks.

## Date/time convention

Every "what day is today" comparison in the app must go through `todayDateKey()` (`src/utils.ts`) — `new Date().toLocaleDateString('en-CA')`, local time, `YYYY-MM-DD`. Never use `new Date().toISOString().slice(0, 10)` for this: it's UTC-based and rolls to tomorrow's date hours before local midnight (for Pacific time, starting mid-afternoon — most of dinner service). `ChefDashboard.tsx` and `TestKitchenHub.tsx` originated this pattern; `DailyCribSheet.tsx`, `Staff.tsx`, `EventCalendar.tsx`, `EventDetailView.tsx`, and the ingredient `lastVerified` stamps (`IngredientForm.tsx`, `InvoicePriceUpdate.tsx`) were audited and migrated to the shared helper, closing the divergence this file used to document between ChefDashboard and Crib Sheet. `toISOString()`/`toLocaleTimeString()` remain fine for full instants (`updatedAt`, `generatedAt`) and pure display formatting where no "is this today" comparison is involved.

Shift/event/milestone times (`Shift.startTime`/`endTime`, `KitchenEvent.time`, `EventMilestone.time`) are stored as native `<input type="time">` 24-hour strings — storage and chronological sorting (`.localeCompare` on the raw string) stay on that format, since it sorts correctly as-is. Display always goes through `formatTime12h()` (`src/utils.ts`), which renders 12-hour "H:MM AM/PM" — used in `Staff.tsx`, `DailyCribSheet.tsx`, `ChefDashboard.tsx`, `EventDetailView.tsx`, and `EventCalendar.tsx`. The unrelated "printed at" wall-clock timestamps in `DailyCribSheet.tsx`/`GuestMenuPreview.tsx` already used `toLocaleTimeString` with AM/PM and are unchanged.

Date-grid math (as opposed to single-date comparisons) also lives in `src/utils.ts`: `parseDateKey(key)` / `toDateKey(date)` convert between a `YYYY-MM-DD` string and a local-time `Date`, and `addDays`/`startOfWeek` build on those for week-boundary arithmetic — Sunday-start, matching `ScheduleCalendar.tsx`'s Week mode. Extracted from that file (previously private, duplicated nothing at the time) ahead of the Weekly Hours strip needing the same week boundary, so both share one definition rather than a second inline copy.

## Known issues

- None currently tracked. (`firestore.rules` was previously stale Base44-era and the app had no sign-in flow — both are resolved: rules now validate the canonical types in `src/types.ts` and gate every collection on `isAuthenticated()`; `src/components/AuthContext.tsx` + `SignIn.tsx` provide real Firebase email/password auth, single operator account, no self-registration.)

## Working Session Protocol

- Feature tests must never write to real pantry ingredients. Test with disposable ingredients created for the test and deleted afterward.

## Orphaned / notable files

Base44-era cruft audit — complete (2026-07-14). Every file below was grep-verified as unreferenced from live code and deleted; `tsc --noEmit` passed clean afterward:

- `src/services/` (entire folder): `apiClient.js`, `apiService.js`, `collectionEngine.js`, stray `apiClient.js# Create the service handler.txt`
- `src/components/dashboard/`: `MenuCollectionCard.jsx`, `menuService.js`, `recipeService.js`, `seedPantry.js`, `config.js` — the folder now holds only `PrepRegistrationForm.tsx`. `LineTimerModule.tsx` and `MetricsHUD.tsx` survived that pass but were later found orphaned (grep-verified zero imports anywhere in `src/`) and deleted 2026-07-16.
- Dead component chain: `src/Dashboard.jsx`, `src/components/KitchenDashboard.jsx` → `src/components/DailyCribSheet.jsx` (old .jsx copy, not the live `src/DailyCribSheet.tsx`) → `src/hooks/usePrepList.js` → `dashboard/config.js`
- `src/components/BrainDumpModule.jsx` — Base44-era, never wired into the rebuild; deleted with explicit chef sign-off (any future Brain Dump gets rebuilt fresh on the current stack)
- Root-level orphaned duplicates: `src/AlertDialog.tsx`, `src/AppHeader.tsx`, `src/CribComponents.tsx`, `src/ErrorBoundary.tsx` (App.tsx imports the `src/components/` versions)

`src/services/analysis/TrendAnalyzer.js` and `src/components/dashboard/TrendSidebar.tsx` were deleted earlier (Test Kitchen Phase B) — both orphaned Base44-era code, and `TrendAnalyzer.js` wrote to a `trend_reports` collection with an incompatible snake_case schema that collided with the real one introduced in that pass.

Gemini-era scaffold audit — complete (2026-07-15), same category as the cadc47a Base44 purge above: every file below was grep-verified as unreferenced from live code and deleted as part of the b8a1ba7 cleanup.

- `docs/` (entire directory): `Firestore_Schema.txt`, `Master_Feature_Manifest.txt`, `MiseOS_Philosophy.txt`, `firebase-blueprint.json`
- `functions/` (entire tree) — a standalone Firebase Functions codebase never wired into `server.ts`'s `/api/ai` proxy pattern; `firebase.json`'s `functions` codebase block and the emulators `functions` port entry were removed alongside it, since there's no functions codebase left to emulate or deploy
- `src/modules/StationMatrix.js` — superseded by the live `station_presets` collection / `useStationPresets()` hook
- `src/components/Dashboard.js` — superseded by `src/ChefDashboard.tsx`
- `src/components/widgets/` (entire folder) — unwired scaffold components

---

## Product Vision & Standards

### What IncendiumPhi Is
A refined, secure, minimalist rebuild of Kitchen Cost Pro (Base44).
The Base44 version proved the concept. This is the professional
engineering of that concept.

Target user: Executive chef at maximum cognitive capacity during
long, high-stress service. The interface reflects that mindset —
zero cognitive overhead, everything where expected, no surprises.

### Quality Standard — Non-Negotiable
Every feature must pass: "Would a chef in the middle of a Friday
dinner service use this, exactly as built, without frustration?"

Ship nothing incomplete. Ship nothing imprecise. If a feature only
kind of makes sense, cut it immediately. A smaller app that works
perfectly beats a large app that almost works.

Every feature earns its place or it doesn't ship.

### Communication Standard
Culinary verbiage means precision and directness — not cooking
metaphors injected into technical explanations.

A build error is a build error. Describe it plainly.
Brian has 20+ years of professional experience. No performance.

Wrong: "Look down at the pass — the oven tried to fire up."
Right: "Vite can't find your Firebase config file. Fix the import
path in BrainDumpModule.jsx."

### Approved Feature Map

DAILY OPERATIONS
- Dashboard / Crib Sheet (features tonight, events snapshot — print-optimized)
- Kitchen Timers (multi-station)
- Alert History

FEATURES (Specials)
- Build nightly specials with course, description, cost, price
- Active date range — 86 mid-service auto-updates Dashboard

RECIPE SYSTEM
- Recipe Builder with [Suggest Ingredients] and [Write Method] AI
- Live Cost Analysis (right panel — cost, FC%, suggested price)
- FDA Nutrition Label (auto-calculated, lives inside recipe)
- Recipe Collections (seasonal groupings, one active at a time)
- Recipe Sharing (read-only link)

INGREDIENTS — MASTER PANTRY
- Static, human-verified only
- Purchase unit, yield %, cost per usable unit (calculated)
- Nutritional data per 100g, allergen flags, vendor links
- Invoice Price Update (human-confirmed): chef photographs/uploads an
  invoice, AI extracts line items via the /api/ai proxy, and every
  price change requires explicit per-line chef acceptance before
  writing. Nothing writes automatically. Updates set
  priceSource: 'invoice' and lastVerified.
- Regional Price Seed (onboarding): app ships with a bundled,
  versioned baseline price dataset plus a static regional multiplier
  table. Chef's location, entered once at onboarding, selects the
  tier. No runtime external calls, no live syncing. Seeded prices
  carry priceSource: 'regional-estimate' and display a persistent
  disclaimer: "Prices are regional estimates based on your location
  and typical volume. They tighten as you update from invoices or
  edit directly."
- Ingredient price provenance: every ingredient carries priceSource
  ('regional-estimate' | 'invoice' | 'manual') and lastVerified.
- Vendors default to generic placeholders (Broadline Distributor,
  Produce Supplier, etc.) until the chef edits them.

MENU
- Active recipes by category with food cost % color coding
- Guest Preview toggle: customer-facing view (name, description, price
  only — no cost/FC%) with a Classic / Clean template picker,
  print-optimized

STAFF & SCHEDULING
- Employee directory: name, positions, active toggle, optional hourly rate
- Planned shifts: date, start/end time, optional station, optional shift
  note — scheduled any distance ahead, not just today
- Week/month calendar merged with Events (part 2)
- Per-employee projected weekly hours with overtime flag (part 2)
- Hourly rate and pay projections are visible ONLY inside the scheduler
  view — never on the Crib Sheet, never in any other view or print output
- Feeds Crib Sheet: today's shifts joined to directory (name,
  position/station, start–end, shift note) — no rates, ever
- EXPLICITLY EXCLUDED, never build: availability management, shift
  swaps/trades, notifications, time-off requests

EVENTS & CLIENTS
- Merged events + catering system — absorbs the standalone Catering
  Module (build order item 10, never built separately)
- Customizable event types (event_types collection, chef-managed CRUD
  from Settings, same pattern as recipe categories) — replaces the
  old fixed Private Dining/Buyout/Special Event set
- Client profiles: name, contact name, phone, email, and an optional
  flag note that renders as a persistent amber warning line on the
  client's directory card (payment history, allergy notes, VIP
  handling — whatever the chef needs surfaced every time)
- Events optionally link to a client (clientId) — walk-in events need
  no client
- Event detail view (click an event from the list): header card (name,
  type badge, date, attendees, that date's staff count + shift notes)
  plus a 2x2 panel grid — Event Timeline, Tentative Menu, Client,
  Change Log
  - Event Timeline: chronological day-of milestones (time + label),
    add/edit/remove inline
  - Tentative Menu: course rows, each line free text or linked to a
    menu recipe via the same search-select pattern as the Recipe
    Builder's line search; linked lines show cost per portion and sum
    to a projected total food cost (attendees × summed per-portion
    cost of linked lines only — labeled "projected, linked items
    only" since free-text lines carry no cost data)
  - Client panel: contact fields, flag note, an expandable list of
    the client's other events (date, type, attendees) that links
    into each event's detail view — same expandable list also lives
    on the client's directory card in Events & Clients
  - Change Log: append-only audit trail of an event's changes — a
    dated "+ Log entry" form for manual notes, plus auto-appended
    entries when attendees changes or a tentative menu line is
    added/removed/swapped (e.g. "Attendees 120 → 140", "Entrees:
    Salmon → Halibut"). Existing entries render read-only, newest
    first — no edit or delete, since the log is the paper trail
- Quote generation — planned, deferred (was Catering's "cost + quote
  generation" ask; ties in once menu selection/costing is added)
- Feeds Crib Sheet: today's events, showing event type badge and,
  compactly beneath the row, that event's milestone timeline
  (time — label) so a chef scanning the sheet mid-service sees
  day-of deadlines (e.g. a 4:30 stationary deadline) without
  opening the event

VENDOR MANAGEMENT
- Supplier directory: name, contact name, phone, email, account number,
  lead time (days), order days (structured weekday multi-select), notes
- Vendor detail: expand a vendor card to see every linked ingredient
  (name, category, last verified, price source) — "what do I get from
  this supplier"
- Master Pantry link: `Ingredient.vendorId` — the ingredient form's
  vendor field is a select fed from the vendor directory; deleting a
  vendor with linked ingredients requires a two-step confirm stating
  the count and clears `vendorId` on those ingredients rather than
  orphaning the reference

SETTINGS — RESTAURANT PROFILE
- Identity: name, chef name, brand color (logo upload deferred —
  noted as pending in the UI, not silently dropped)
- Kitchen Context: cuisine style, price point, target FC%
- Regional Intelligence: city/state, local ingredients and
  traditions (free text) — injected into every AI prompt where
  it's genuinely relevant (Sous, ingredient lookup, invoice
  add-to-pantry suggestions, Recipe Builder AI buttons; not the
  raw invoice-extraction OCR pass, which has no use for it)
  A chef in Buffalo has a different conversation than Napa.
  The AI knows this without being told each time.

AI LAYER
- Test Kitchen / Dish Optimizer (exists — Anthropic API). Culinary
  Trends & Forecasts (Phase B ✓) is editorial and read-only by hard
  boundary — see the Test Kitchen section above; it never touches
  the pantry, costing, or any other domain data.
- Sous ("Chef Matthew" — direct, practical, no mascot) — the
  persona shipped early, inside the Test Kitchen Playground chat
  (`src/lib/sousPersona.ts`, item 15's regional context injected
  into it). Expanded 2026-07-18 from a single culinary advisor into
  five domains — culinary, restaurant business, front of house, the
  app itself, and this restaurant's brand — plus a fixed persona
  canon (backstory, self-awareness, humor calibration) injected
  verbatim so answers stay consistent under testing; see PROMPTS.md
  for the decision. App facts come only from the maintained
  `src/lib/sousAppKnowledge.ts` (update it whenever a module ships,
  a nav tab renames, or a feature moves — Sous is never allowed to
  freehand what the app does); restaurant facts come only from the
  Restaurant Profile via `withRegionContext`. Hard rule: Sous never
  invents a fact about the restaurant or the app — anything outside
  those two injected sources gets an honest "I don't have that on
  file," never a plausible-sounding guess. A standalone "Chef Chat"
  surface separate from the Playground is still intentionally not
  built — it would duplicate the same persona behind a second UI
  with no clear new capability. Build it only if a real gap shows
  up that the Playground can't cover.
- Ingredient Advisor (web-search enabled, region-aware)

### Permanently Purged — Never Rebuild
- Handover Log
- Live POS Sync
- Automatic Reservation Sync
- Financial Smoke Detector
- Market Volatility Tracking
- Training Dashboard
- Hostess Chat
- 86'd Items (standalone `items86` collection — separate from `Feature.is86d`, which is live and unrelated)

### Master Pantry Mandate
No live data feeds. No automatic mutation. No vendor-system
integrations. Every price change is chef-confirmed.

Clearly-labeled static estimates are permitted as starting defaults
(regional seed data, invoice-extracted line items awaiting
acceptance) — chef verification remains the goal state, not the
only allowed state.

### Build Order
1. ~~Remove Handover Log remnants from useKitchenState.ts and types.ts~~ ✓
2. ~~Daily Crib Sheet (print-optimized)~~ ✓
3. ~~Features Module~~ ✓
4. ~~Staff (lightweight)~~ ✓ — Staff & Scheduling part 2 added later, both items now complete: week/month calendar merged with Events (`components/staff/ScheduleCalendar.tsx`) and the per-employee weekly-hours/overtime-flag strip — see the Staff Schedule Calendar section above. Every STAFF & SCHEDULING item in the Approved Feature Map is now built
5. ~~Event Calendar~~ ✓ — upgraded to Events & Clients (part 1 of 3: data model + clients ✓; part 2 of 3: event detail view with milestone timeline + tentative menu ✓; part 3 of 3: change log + client event-history view ✓)
6. ~~Ingredients Master Library~~ ✓
7. ~~Invoice Price Update (human-confirmed)~~ ✓
8. ~~Recipe Builder + Cost Engine~~ ✓ (AI buttons shipped as "Build From Pantry" / "Draft Method" via `/api/ai` — pantry-constrained suggestions, chef-confirmed accepts)
9. ~~Menu View~~ ✓ (operational cost/FC% view + Guest Preview with Classic/Clean templates)
10. ~~Catering Module~~ — absorbed into Events & Clients (item 5); no standalone Catering Module will be built
11. ~~Vendor Management~~ ✓
12. Sous (Chef Chat) — persona shipped early inside the Test Kitchen
    Playground (`src/lib/sousPersona.ts`); a standalone chat surface
    is intentionally not built unless it earns its place over the
    Playground
13. ~~Ingredient Advisor~~ ✓ — web-search-grounded advisory modal on the Master Pantry view (`components/ingredients/IngredientAdvisor.tsx`, `src/lib/advisorPersona.ts`); `/api/ai` proxy gained a whitelisted `tools` passthrough for the `web_search` server tool only
14. ~~FDA Label (inside Recipe)~~ ✓ — `src/lib/nutritionEngine.ts` (pure aggregation, costEngine-style recursion, completeness report), `src/lib/fdaRounding.ts` (21 CFR 101.9(c) rounding + %DV), `components/recipes/NutritionLabel.tsx` (vertical FDA panel in the Recipe Builder cost panel, menu recipes only; "Contains:" is Big-9 only, gluten/sulfites as advisory, AI-estimated/incomplete/volume-approximation disclosures). "Estimate Nutrition (AI)" backfill button on the ingredient edit form stamps `nutritionSource: 'ai'` unless the chef edits the values
15. ~~Restaurant Profile / Regional Intelligence~~ ✓ — built ahead of
    items 12-13 and Test Kitchen's seasonal work since they depend on
    it; logo upload still pending
16. Recipe Collections + Sharing — part 1 (Collections) ✓: `src/RecipeCollections.tsx` RecipesHub sub-tab, `recipe_collections` collection, `isRecipeOnMenu` extended (see the Recipe Collections section). Part 2 (Sharing, read-only link) deferred pending a public-read security-rules design — current rules gate everything on `isAuthenticated()` and `server.ts` has no Firestore access, so a share link needs a deliberate architecture decision, not a quick add
