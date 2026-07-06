# MiseOS — CLAUDE.md

## What this is

MiseOS ("The Pass") is a restaurant back-of-house management app. It is a single-page React app served by an Express server, with Firebase Firestore as the live database.

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

`ANTHROPIC_API_KEY` must never carry a `VITE_` prefix — Vite embeds `VITE_*` vars into the client bundle, which would ship the key to the browser. It is read only by `server.ts`, never imported in `src/`.

## Project structure

```
server.ts                        Express entry point
src/
  main.tsx                       React root
  App.tsx                        View router (viewMap + lazy loading)
  firebaseConfig.ts              Firebase init
  types.ts                       Canonical type definitions
  data.ts                        Static seed/mock data
  utils.ts                       Helpers (formatDuration, etc.)

  DailyCribSheet.tsx             Crib Sheet view — five sections, print-optimized
  Features.tsx                   Nightly specials CRUD — 86 toggle syncs to Crib Sheet live
  Staff.tsx                      Employee directory + shift scheduling — feeds Crib Sheet (today's shifts only)
  EventCalendar.tsx              Events & Clients — event/client CRUD, grouped by date, upcoming/past split, feeds Crib Sheet; clicking an event opens EventDetailView
  PrepChecklist.tsx              Par-level deficit tracking table
  KitchenTimers.tsx              Multi-station countdown timers (Firestore-backed)
  TestKitchenHub.tsx             AI dish optimizer (calls server-side /api/ai proxy)
  Settings.tsx                   Theme toggle + station preset CRUD + recipe category CRUD
  HistoricalAlerts.tsx           Alert History view (all alerts, read-only)
  IngredientsTable.tsx           Master Pantry — static human-verified ingredient CRUD, unit conversion
  Recipes.tsx                    Recipe Builder — list (Menu Recipes / Sub-Recipes) + editor + Live Cost Analysis
  Menu.tsx                       Menu view — operational (FC%/cost) table + Guest Preview toggle

  components/
    AppHeader.tsx                Nav bar — edit navItems[] to add/remove tabs
    KitchenStateContext.tsx      React context wrapping KitchenStateProvider
    ErrorBoundary.tsx
    AlertDialog.tsx
    CribComponents.tsx           Shared Section wrapper
    StationPassHeader.tsx
    GuestMenuPreview.tsx         Guest-facing menu templates (Classic / Clean), print-optimized

    ingredients/
      InvoicePriceUpdate.tsx     Photo/PDF invoice → AI-extracted line items → human-confirmed price writes
      AiIngredientLookup.tsx     Name → AI-proposed ingredient → chef-reviewed add (default Add Ingredient path)
      IngredientForm.tsx         Shared form/types/toDoc used by AiIngredientLookup, manual add, and edit

    events/
      EventDetailView.tsx        Event detail: header card (name/type/date/attendees/staff strip) + Timeline, Tentative Menu, Client, Change Log (placeholder) panel grid

    dashboard/
      LineTimerModule.tsx
      MetricsHUD.tsx
      PrepRegistrationForm.tsx
      TrendSidebar.tsx

  hooks/
    useKitchenState.ts           Firestore listeners for all collections
    useStationPresets.ts         Firestore listener for station_presets collection
    useRecipeCategories.ts       Firestore listener for recipe_categories collection, seeds defaults if empty

  lib/
    costEngine.ts                recipeCost / costPerPortion / fcPercent / suggestedPrice / wouldCreateCycle + computeCostPerBaseUnit
    units.ts                     Canonical unit conversion (g/ml/each base; imperial/metric display)
```

## Navigation / routing

There is no router library. Navigation is a `useState` string in `App.tsx`. The `viewMap` object maps view keys to lazy-loaded components. To add a tab:

1. Add a lazy import in `App.tsx`
2. Add an entry to `viewMap` in `App.tsx`
3. Add a `navItems` entry in `src/components/AppHeader.tsx`

Current nav tabs (in order): Crib Sheet · Features · Staff · Events & Clients · Ingredients · Recipes · Prep Checklist · Kitchen Timers · Alert History · Test Kitchen · Settings

## Firestore collections

| Collection | Used by |
|---|---|
| `prepItems` | `useKitchenState`, `PrepChecklist` |
| `recipes` | `useKitchenState`, `Recipes.tsx` |
| `items86` | `useKitchenState` |
| `features` | `useKitchenState`, `Features`, `DailyCribSheet` |
| `staff` | `useKitchenState`, `Staff.tsx` — employee directory (repurposed from daily roster) |
| `shifts` | `useKitchenState`, `Staff.tsx`, `DailyCribSheet` — planned shifts, joined to `staff` for display |
| `events` | `useKitchenState`, `EventCalendar`, `DailyCribSheet` — `clientId?` optionally links to `clients`; `attendees` renamed from `covers` (old docs read via a code-level fallback, no data migration) |
| `clients` | `useKitchenState`, `EventCalendar` — catering/events client directory |
| `alerts` | `useKitchenState`, `DailyCribSheet`, `HistoricalAlerts` |
| `crib_notes` | `useKitchenState`, `DailyCribSheet` |
| `timers` | `KitchenTimers.tsx` |
| `station_presets` | `useStationPresets`, `Settings.tsx`, `KitchenTimers.tsx` |
| `ingredients` | `useKitchenState`, `IngredientsTable.tsx` |
| `recipe_categories` | `useRecipeCategories`, `Settings.tsx`, `Recipes.tsx` — seeded with Sides/Sauces/Salads/Soups/Proteins/Desserts if empty |
| `event_types` | `useEventTypes`, `Settings.tsx`, `EventCalendar` — seeded with Wedding/Private Dining/Buyout/Bridal Shower/Corporate/Celebration of Life/Special Event if empty |

`alerts`: crib sheet shows `resolved === false` only; Alert History shows all.

## Canonical types (`src/types.ts`)

| Type | Description |
|---|---|
| `PrepItem` / `ProductionRun` | Prep checklist task |
| `Recipe` | id, name, recipeType ('sub' \| 'menu'), course, categoryId?, batchYield { qty, measureType }, portions, lines: RecipeLine[], methodSteps, menuPrice?, menuDescription?, updatedAt |
| `RecipeLine` | A recipe component: `{ type: 'ingredient' \| 'recipe', refId, qty, note? }`. `qty` is always canonical base units. Only `recipeType: 'sub'` recipes may be referenced as a line — menu recipes never nest |
| `Item86` / `Item86Entry` | 86'd item |
| `PrepStation` | `'Sauté' \| 'Grill' \| 'Garde Manger' \| 'Pastry'` |
| `Feature` | Nightly special (course, name, description, price, cost, activeFrom, activeTo, is86d) |
| `Employee` | Directory entry: id, name, positions: string[], hourlyRate?, active |
| `Shift` | Planned shift: id, staffId (→ Employee), date, startTime, endTime, station?: PrepStation, note? |
| `EventTypePreset` | Chef-managed event type (id, name), CRUD'd from Settings the same way as `RecipeCategory` — `KitchenEvent.eventType` stores the name directly, no id reference |
| `Client` | Catering/events client: id, name, contactName, phone, email, flagNote? — `flagNote` renders as a persistent amber flag line on the client's directory card |
| `EventMilestone` | Day-of timeline entry on an event: `{ time, label }` — `time` is an `HH:MM` string, list is sorted by time for display |
| `TentativeMenuLine` | Tentative menu line on an event: `{ course, text, recipeId? }` — `text` is the display label either way (free-typed, or the linked recipe's name); `recipeId` optionally points at a `recipeType: 'menu'` recipe for cost projection |
| `KitchenEvent` | Event (title, date, time, attendees?, notes?, eventType?: string, clientId?: string → Client, milestones?: EventMilestone[], tentativeMenu?: TentativeMenuLine[]) |
| `KitchenAlert` | Alert (message, severity, resolved, timestamp) |
| `CribNote` | Freeform crib note (date, content, author) |
| `KitchenTimer` | Countdown timer |
| `TrendReport` | Recipe trend scores |
| `Ingredient` | Master Pantry item: name, category, measureType, purchaseUnit, purchaseCost, purchaseQty, yieldPercent, pieceWeightG? (ordered portion spec in grams for portioned weight product, e.g. 6 oz breasts — drives piece-true costing in costEngine [cost ÷ floor(pack/spec) pieces, shortfall treated as unusable pack-out], pieces-per-case, cost-per-piece, and each-yield derivation in the Recipe Builder; absent for bulk/randoms), nutritionPer100g?, allergens?, vendorId?, lastVerified, priceSource, nutritionSource? ('ai' \| 'manual') |
| `RecipeCategory` | Chef-managed recipe category (id, name), CRUD'd from Settings — referenced by `Recipe.categoryId` |
| `IngredientCategory` | `'Produce' \| 'Protein' \| 'Dairy' \| 'Dry Goods' \| 'Frozen' \| 'Beverage' \| 'Other'` |
| `MeasureType` | `'weight' \| 'volume' \| 'each'` — determines base unit (g, ml, each) |
| `Allergen` | FDA Big-9: `'milk' \| 'eggs' \| 'fish' \| 'shellfish' \| 'treeNuts' \| 'peanuts' \| 'wheat' \| 'soybeans' \| 'sesame'` |
| `NutritionPer100g` | Optional nutrition facts stored per 100g on each Ingredient |
| `PriceSource` | `'regional-estimate' \| 'invoice' \| 'manual'` — provenance of an `Ingredient`'s `purchaseCost`, paired with `lastVerified` |
| `MenuTemplate` | `'classic' \| 'clean'` — Guest Preview styling choice on the Menu view, persisted like `unitSystem`/`targetFcPercent` |

Note: `useKitchenState.ts` also defines `PrepItem` and `Item86` locally (pre-existing duplication). `Recipe` was de-duplicated — `useKitchenState.ts` now imports the canonical type from `src/types.ts` directly. New types belong in `src/types.ts` only.

## Design system

MiseOS brand kit v1.0 — Cool tone / Rounded corners / Saffron signal. Tokens defined as a Tailwind v4 `@theme` block in `src/index.css`, mirrored in `design-tokens.json`'s `colors` and `border-radius` sections.

- **Background:** `bg-bg-cool` (page), `bg-surface` (cards/panels — cream)
- **Borders:** `border-line`
- **Text:** `text-navy` primary, `text-slate` muted
- **Accent:** `text-teal` / `bg-teal` (active states), `text-saffron` / `bg-saffron` (signal/CTA)
- **Danger:** `red-400` / `red-950` (unchanged — no brand-kit danger color defined)
- **Font:** `font-display` (Quicksand — headings/brand), `font-body` (Nunito Sans — body copy)
- **Cards:** `bg-surface border border-line rounded-card`
- **Radius:** `rounded-card` (22px), `rounded-tile` (28px)
- **Spacing:** Fibonacci-based tokens from `design-tokens.json` — use as Tailwind arbitrary values (`p-[21px]`, `gap-[34px]`, etc.)
- No emojis. No comments explaining what code does.
- No open free-text inputs except names, comments, and special requests — all
  other values come from structured selects, ideally user-customizable lists.

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

Left panel lists recipes grouped by `recipeType` first (Menu Recipes, then Sub-Recipes), and within Menu Recipes, sub-grouped by resolved category label. Selecting or creating a recipe opens the editor on the golden split from `design-tokens.json` (61.8% editor / 38.2% Live Cost Analysis panel).

- **Recipe categories** (`recipe_categories` collection, CRUD'd from Settings, same pattern as station presets) replace the old free-text `course` field with a `categoryId` select in the editor — applies to both menu and sub-recipes. `Recipe.course` is kept in sync with the chosen category's name as a denormalized fallback. Recipes saved before categories existed (or whose category was later deleted) display as `"{course} (uncategorized)"` in the list until re-saved with a real category.
- Filter chips (All + one per category) sit above the recipe list and filter both the Menu Recipes and Sub-Recipes groups, stacking with the existing name search.
- The ingredient/sub-recipe line search box in the editor has its own category chip row to filter sub-recipe results (e.g. pull up all Sauces) independent of the list pane's filter; typing a name and picking a category combine.

- **Menu recipes** (`recipeType: 'menu'`) are finished, sellable plates — the cost panel shows batch cost, cost/portion, an editable menu price, and FC% (color-coded against the `targetFcPercent` Settings value: emerald ≤ target, amber ≤ target+5, red above) plus a suggested price at target FC%.
- **Sub-recipes** (`recipeType: 'sub'`) are component preparations (stocks, sauces, prep) — no menu price or FC%; the cost panel shows only batch cost and cost per canonical base unit of the batch yield.
- Only `recipeType: 'sub'` recipes are selectable as a `RecipeLine` inside another recipe's ingredient list — menu recipes never nest. The line search box still shows a blocked candidate (self-reference or one that would create a cycle) disabled with a "Circular reference" badge, rather than hiding it.
- Cost math lives in `src/lib/costEngine.ts`: `recipeCost` recurses through sub-recipe lines with cycle detection (throws a descriptive error if a cycle is ever hit despite the UI block), `costPerPortion`, `fcPercent`, and `suggestedPrice` are pure functions built on top of it.
- The batch scale control (×0.5 / ×2 / custom) only scales the numbers displayed in the cost panel — it never mutates the stored recipe.
- `targetFcPercent` (default 30) is a global setting stored the same way as `unitSystem` (React state in `App.tsx`, persisted to `localStorage`), editable in Settings under "Recipe Costing".

## Menu View (Menu.tsx)

Two modes on one screen, toggled by the "Guest Preview" button — no separate nav tab.

- **Operational** (default): the read-only cost/FC% table described above in the Approved Feature Map's MENU entry — name, menu price, cost/portion, FC%, grouped by category.
- **Guest Preview**: `components/GuestMenuPreview.tsx` renders what the customer sees — recipe name, `menuDescription`, `menuPrice`, grouped by category — with cost/FC% data entirely absent. Only menu recipes with a `menuPrice > 0` are listed; unpriced items are silently omitted (a guest menu never shows a blank price). Categories that resolve to no priced items are omitted; the internal "Uncategorized" fallback label is never shown here.
- **Templates**: a Classic/Clean picker in the Guest Preview toolbar selects between two fixed, print-ready visual styles (cream/serif/two-column vs. white/single-column with dotted price leaders). Both are data-only styling choices — same `guestGroups` derivation feeds either one. A consumer advisory line ("Consuming raw or undercooked meat...") is a fixed footer in both templates, not tied to any data field.
- Template choice is `menuTemplate` (`'classic' | 'clean'`, type in `src/types.ts`), stored the same way as `unitSystem`/`targetFcPercent` (React state in `App.tsx`, persisted to `localStorage` under `miseos_menu_template`, default `'clean'`). Restaurant Profile (build order item 15) will take over ownership of this setting alongside logo/brand color once it exists; for now there's no restaurant-identity data to show, so both templates render a generic "Menu" header rather than a fabricated restaurant name.
- Print: both templates carry their own `@media print` rules (page size/margins, hides app chrome and the toolbar, forces background-color printing via `print-color-adjust`). The Classic template's two-column layout uses CSS `column-count`, which also paginates correctly across printed pages.

## AI feature (TestKitchenHub)

The browser never talks to Anthropic directly. `TestKitchenHub.tsx` posts `{ system, messages, max_tokens }` to `POST /api/ai` on the Express server; `server.ts` calls `https://api.anthropic.com/v1/messages` server-side with `ANTHROPIC_API_KEY` (read from `process.env`, never a `VITE_` var) and relays Anthropic's JSON response back verbatim, including its `{ error: { message } }` shape on failure. Model is `claude-sonnet-4-6`, default max 1024 tokens.

Any future AI feature must follow this same proxy pattern — no `fetch` to `api.anthropic.com` from `src/`, no Anthropic key in a `VITE_*` env var.

## Known pre-existing TypeScript errors

`npm run lint` reports ~60 errors that predate this project. Do not fix them unless that is the stated task. Key categories:

- `useKitchenState.ts` — Firestore namespace types (`FirestoreError`, `QuerySnapshot`, etc.) used as value types; should be type-only imports from `firebase/firestore`. All listeners (old and new) carry this error.
- `PrepRegistrationForm.tsx` — `PrepItem.quantity` is `number` in `src/types.ts` but `string` in `useKitchenState.ts` (local duplicate interface mismatch)
- `data.ts` — seed data doesn't match current type shapes (unused/orphaned file — nothing imports its exports)
- `main.tsx` — `document.getElementById` can return `null`
- `@/types` / `@/lib/utils` path alias unresolved in a few files (tsconfig path mapping issue) — `LineTimerModule.tsx`, `MetricsHUD.tsx`, `TrendSidebar.tsx`, `StationPassHeader.tsx`

## Known issues

- `firestore.rules` is stale Base44-era: it validates an old schema (`vendor_id`, `cost_per_unit`, `price_source: 'regional_estimate'|'invoice_scan'`, etc.) that doesn't match the canonical types in `src/types.ts`, and requires `isAuthenticated()`/`isEditor()` for writes even though the app has no sign-in flow. Must be rewritten to match canonical types, and the auth story decided, before any real deployment.

## Working Session Protocol

- Feature tests must never write to real pantry ingredients. Test with disposable ingredients created for the test and deleted afterward.

## Orphaned / notable files

Several component files exist at both `src/*.tsx` (root) and `src/components/*.tsx`. App.tsx imports from `src/components/`. The root-level duplicates (`src/AlertDialog.tsx`, `src/AppHeader.tsx`, `src/CribComponents.tsx`, `src/ErrorBoundary.tsx`) are orphaned copies and are never imported.

---

## Product Vision & Standards

### What MiseOS Is
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
- Dashboard / Crib Sheet (86'd items, features tonight, events snapshot — print-optimized)
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
  - Client panel: contact fields, flag note, count of past events —
    full client event-history view is planned (part 3)
  - Change Log: placeholder — audit trail of edits to an event or
    client record is planned (part 3)
- Quote generation — planned, deferred (was Catering's "cost + quote
  generation" ask; ties in once menu selection/costing is added)
- Feeds Crib Sheet: today's events, showing linked client name when
  present

VENDOR MANAGEMENT
- Supplier contacts, lead times, linked to Master Pantry

SETTINGS — RESTAURANT PROFILE
- Identity: name, logo, chef name, brand color
- Kitchen Context: cuisine style, price point, target FC%
- Regional Intelligence: city/state, local ingredients and
  traditions (free text) — injected into every AI prompt
  A chef in Buffalo has a different conversation than Napa.
  The AI knows this without being told each time.

AI LAYER
- Test Kitchen / Dish Optimizer (exists — Anthropic API)
- Sous (BOH culinary advisor — direct, practical, no mascot)
- Ingredient Advisor (web-search enabled, region-aware)

### Permanently Purged — Never Rebuild
- Handover Log
- Live POS Sync
- Automatic Reservation Sync
- Financial Smoke Detector
- Market Volatility Tracking
- Training Dashboard
- Hostess Chat

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
4. ~~Staff (lightweight)~~ ✓
5. ~~Event Calendar~~ ✓ — upgrading to Events & Clients (part 1 of 3: data model + clients ✓; part 2 of 3: event detail view with milestone timeline + tentative menu ✓; part 3/3 pending: change log, full client event-history view)
6. ~~Ingredients Master Library~~ ✓
7. ~~Invoice Price Update (human-confirmed)~~ ✓
8. ~~Recipe Builder + Cost Engine~~ ✓ (AI buttons shipped as "Build From Pantry" / "Draft Method" via `/api/ai` — pantry-constrained suggestions, chef-confirmed accepts)
9. ~~Menu View~~ ✓ (operational cost/FC% view + Guest Preview with Classic/Clean templates)
10. ~~Catering Module~~ — absorbed into Events & Clients (item 5); no standalone Catering Module will be built
11. Vendor Management
12. Sous (Chef Chat)
13. Ingredient Advisor
14. FDA Label (inside Recipe)
15. Restaurant Profile / Regional Intelligence
16. Recipe Collections + Sharing
