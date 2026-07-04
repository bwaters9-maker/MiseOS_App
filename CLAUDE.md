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
- **AI:** Anthropic API called directly from the browser in `TestKitchenHub.tsx` using `VITE_ANTHROPIC_API_KEY`
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
VITE_ANTHROPIC_API_KEY
```

Firebase config also accepts non-prefixed `FIREBASE_*` keys (see `src/firebaseConfig.ts`).

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
  PrepChecklist.tsx              Par-level deficit tracking table
  KitchenTimers.tsx              Multi-station countdown timers (Firestore-backed)
  TestKitchenHub.tsx             AI dish optimizer (calls Anthropic API directly)
  Settings.tsx                   Theme toggle + station preset CRUD
  HistoricalAlerts.tsx           Alert History view (all alerts, read-only)
  IngredientsTable.tsx
  RecipeSpecSheet.tsx

  components/
    AppHeader.tsx                Nav bar — edit navItems[] to add/remove tabs
    KitchenStateContext.tsx      React context wrapping KitchenStateProvider
    ErrorBoundary.tsx
    AlertDialog.tsx
    CribComponents.tsx           Shared Section wrapper
    RecipeParser.tsx
    StationPassHeader.tsx

    dashboard/
      LineTimerModule.tsx
      MetricsHUD.tsx
      PrepRegistrationForm.tsx
      RecipeBuilder.tsx
      TrendSidebar.tsx

    ingredients/
      IngredientForm.tsx

    recipes/
      RecipeCostSummary.tsx
      RecipeDetail.tsx
      RecipeHeader.tsx
      RecipeIngredientLines.tsx
      RecipeTrendCard.tsx

  hooks/
    useKitchenState.ts           Firestore listeners for all collections
    useStationPresets.ts         Firestore listener for station_presets collection

  lib/
    costEngine.ts                Recipe cost calculation logic
```

## Navigation / routing

There is no router library. Navigation is a `useState` string in `App.tsx`. The `viewMap` object maps view keys to lazy-loaded components. To add a tab:

1. Add a lazy import in `App.tsx`
2. Add an entry to `viewMap` in `App.tsx`
3. Add a `navItems` entry in `src/components/AppHeader.tsx`

Current nav tabs (in order): Crib Sheet · Prep Checklist · Kitchen Timers · Alert History · Test Kitchen · Settings

## Firestore collections

| Collection | Used by |
|---|---|
| `prepItems` | `useKitchenState`, `PrepChecklist` |
| `recipes` | `useKitchenState`, `RecipeBuilder` |
| `items86` | `useKitchenState` |
| `features` | `useKitchenState`, `DailyCribSheet` |
| `staff` | `useKitchenState`, `DailyCribSheet` |
| `events` | `useKitchenState`, `DailyCribSheet` |
| `alerts` | `useKitchenState`, `DailyCribSheet`, `HistoricalAlerts` |
| `crib_notes` | `useKitchenState`, `DailyCribSheet` |
| `timers` | `KitchenTimers.tsx` |
| `station_presets` | `useStationPresets`, `Settings.tsx`, `KitchenTimers.tsx` |

`alerts`: crib sheet shows `resolved === false` only; Alert History shows all.

## Canonical types (`src/types.ts`)

| Type | Description |
|---|---|
| `PrepItem` / `ProductionRun` | Prep checklist task |
| `Recipe` | Recipe with scaling and cost |
| `Item86` / `Item86Entry` | 86'd item |
| `PrepStation` | `'Sauté' \| 'Grill' \| 'Garde Manger' \| 'Pastry'` |
| `Feature` | Nightly special (course, name, price, cost) |
| `StaffMember` | Staff on today (name, role, station, clockIn) |
| `KitchenEvent` | Event (title, time, covers, notes) |
| `KitchenAlert` | Alert (message, severity, resolved, timestamp) |
| `CribNote` | Freeform crib note (date, content, author) |
| `KitchenTimer` | Countdown timer |
| `TrendReport` | Recipe trend scores |

Note: `useKitchenState.ts` also defines `PrepItem`, `Recipe`, and `Item86` locally (pre-existing duplication). The canonical definitions are in `src/types.ts`. New types belong in `src/types.ts` only.

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

## AI feature (TestKitchenHub)

Calls `https://api.anthropic.com/v1/messages` directly from the browser using `anthropic-dangerous-direct-browser-calls: true`. Model is `claude-sonnet-4-6`, max 1024 tokens. The API key is `VITE_ANTHROPIC_API_KEY` — never commit it.

## Known pre-existing TypeScript errors

`npm run lint` reports ~60 errors that predate this project. Do not fix them unless that is the stated task. Key categories:

- `useKitchenState.ts` — Firestore namespace types (`FirestoreError`, `QuerySnapshot`, etc.) used as value types; should be type-only imports from `firebase/firestore`. All listeners (old and new) carry this error.
- `RecipeBuilder.tsx` — references fields (`costPerUnit`, `name`, `unit`, `totalCost`) missing from `RecipeIngredient` and `Recipe` types
- `PrepRegistrationForm.tsx` — `PrepItem.quantity` is `number` in `src/types.ts` but `string` in `useKitchenState.ts` (local duplicate interface mismatch)
- `data.ts` — seed data doesn't match current type shapes
- `utils.ts` / `IngredientsTable.tsx` — import `Ingredient` which is not exported from `src/types.ts`
- `main.tsx` — `document.getElementById` can return `null`
- `@/types` path alias unresolved in several files (tsconfig path mapping issue)

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

MENU
- Active recipes by category with food cost % color coding

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
- Invoice Scanning
- Market Volatility Tracking
- Training Dashboard
- Hostess Chat
- Staff shift scheduling system

### Master Pantry Mandate
All ingredient data is static and human-verified.
No invoice scanning. No live syncing. No external data. Ever.

### Build Order
1. ~~Remove Handover Log remnants from useKitchenState.ts and types.ts~~ ✓
2. ~~Daily Crib Sheet (print-optimized)~~ ✓
3. Features Module
4. Staff (lightweight)
5. Event Calendar
6. Ingredients Master Library
7. Recipe Builder + Cost Engine
8. Menu View
9. Catering Module
10. Vendor Management
11. Sous (Chef Chat)
12. Ingredient Advisor
13. FDA Label (inside Recipe)
14. Restaurant Profile / Regional Intelligence
15. Recipe Collections + Sharing
