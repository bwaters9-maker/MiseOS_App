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
  Staff.tsx                      Today's roster CRUD — date-filtered, feeds Crib Sheet only
  EventCalendar.tsx              Event CRUD — grouped by date, upcoming/past split, feeds Crib Sheet
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

Current nav tabs (in order): Crib Sheet · Features · Staff · Events · Ingredients · Recipes · Prep Checklist · Kitchen Timers · Alert History · Test Kitchen · Settings

## Firestore collections

| Collection | Used by |
|---|---|
| `prepItems` | `useKitchenState`, `PrepChecklist` |
| `recipes` | `useKitchenState`, `Recipes.tsx` |
| `items86` | `useKitchenState` |
| `features` | `useKitchenState`, `Features`, `DailyCribSheet` |
| `staff` | `useKitchenState`, `Staff`, `DailyCribSheet` |
| `events` | `useKitchenState`, `EventCalendar`, `DailyCribSheet` |
| `alerts` | `useKitchenState`, `DailyCribSheet`, `HistoricalAlerts` |
| `crib_notes` | `useKitchenState`, `DailyCribSheet` |
| `timers` | `KitchenTimers.tsx` |
| `station_presets` | `useStationPresets`, `Settings.tsx`, `KitchenTimers.tsx` |
| `ingredients` | `useKitchenState`, `IngredientsTable.tsx` |
| `recipe_categories` | `useRecipeCategories`, `Settings.tsx`, `Recipes.tsx` — seeded with Sides/Sauces/Salads/Soups/Proteins/Desserts if empty |

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
| `StaffMember` | Staff on today (name, role, station: PrepStation, clockIn, date) |
| `EventType` | `'Private Dining' \| 'Buyout' \| 'Special Event'` |
| `KitchenEvent` | Event (title, date, time, covers, notes, eventType: EventType) |
| `KitchenAlert` | Alert (message, severity, resolved, timestamp) |
| `CribNote` | Freeform crib note (date, content, author) |
| `KitchenTimer` | Countdown timer |
| `TrendReport` | Recipe trend scores |
| `Ingredient` | Master Pantry item (name, category, measureType, purchaseCost, purchaseQty, yieldPercent, nutrition, allergens) |
| `RecipeCategory` | Chef-managed recipe category (id, name), CRUD'd from Settings — referenced by `Recipe.categoryId` |
| `IngredientCategory` | `'Produce' \| 'Protein' \| 'Dairy' \| 'Dry Goods' \| 'Frozen' \| 'Beverage' \| 'Other'` |
| `MeasureType` | `'weight' \| 'volume' \| 'each'` — determines base unit (g, ml, each) |
| `Allergen` | FDA Big-9: `'milk' \| 'eggs' \| 'fish' \| 'shellfish' \| 'treeNuts' \| 'peanuts' \| 'wheat' \| 'soybeans' \| 'sesame'` |
| `NutritionPer100g` | Optional nutrition facts stored per 100g on each Ingredient |

Note: `useKitchenState.ts` also defines `PrepItem` and `Item86` locally (pre-existing duplication). `Recipe` was de-duplicated — `useKitchenState.ts` now imports the canonical type from `src/types.ts` directly. New types belong in `src/types.ts` only.

## Design system

- **Background:** `bg-black` / `bg-zinc-950`
- **Borders:** `border-zinc-800` / `border-zinc-900`
- **Text:** `text-zinc-100` primary, `text-zinc-500` muted
- **Accent:** `emerald-400` / `emerald-700` (active states, CTAs)
- **Danger:** `red-400` / `red-950`
- **Font:** `font-mono` throughout; `font-black` + `uppercase` + `tracking-wider` for headings
- **Cards:** `bg-zinc-950 border border-zinc-800 rounded-xl`
- **Spacing:** Fibonacci-based tokens from `design-tokens.json` — use as Tailwind arbitrary values (`p-[21px]`, `gap-[34px]`, etc.)
- No emojis. No comments explaining what code does.

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

CATERING
- Events, client info, menu selection, cost + quote generation
- Feeds Event Calendar → feeds Crib Sheet

STAFF (lightweight)
- Name, role, station, clock-in time for today
- Feeds Crib Sheet only

EVENT CALENDAR
- Private dining, buyouts, special events
- Feeds Crib Sheet

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
- Staff shift scheduling system

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
5. ~~Event Calendar~~ ✓
6. ~~Ingredients Master Library~~ ✓
7. Invoice Price Update (human-confirmed)
8. ~~Recipe Builder + Cost Engine~~ ✓ (AI buttons — [Suggest Ingredients] / [Write Method] — still pending, land via `/api/ai`)
9. ~~Menu View~~ ✓ (operational cost/FC% view + Guest Preview with Classic/Clean templates)
10. Catering Module
11. Vendor Management
12. Sous (Chef Chat)
13. Ingredient Advisor
14. FDA Label (inside Recipe)
15. Restaurant Profile / Regional Intelligence
16. Recipe Collections + Sharing
