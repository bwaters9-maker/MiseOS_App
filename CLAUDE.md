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

  components/
    AppHeader.tsx                Nav bar — edit navItems[] to add/remove tabs
    KitchenStateContext.tsx      React context wrapping KitchenStateProvider
    ErrorBoundary.tsx
    AlertDialog.tsx
    CribComponents.tsx           Shared Section wrapper used by DailyCribSheet
    RecipeParser.tsx
    StationPassHeader.tsx

    dashboard/
      DailyCribSheet.tsx         Main dashboard view (loaded as "dashboard" route)
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
    useKitchenState.ts           Firestore listeners for prepItems, recipes, items86
    useStationPresets.ts         Firestore listener for station_presets collection

  lib/
    costEngine.ts                Recipe cost calculation logic

  PrepChecklist.tsx              Par-level deficit tracking table
  KitchenTimers.tsx              Multi-station countdown timers (Firestore-backed)
  TestKitchenHub.tsx             AI dish optimizer (calls Anthropic API directly)
  Settings.tsx                   Theme toggle + station preset CRUD
  Dashboard.tsx                  ** ORPHANED — not imported anywhere, see notes below
  HistoricalAlerts.tsx
  IngredientsTable.tsx
  RecipeSpecSheet.tsx
  ShiftHandoverLog.tsx           ** DELETED
  HandoverLog.tsx                ** DELETED
```

## Navigation / routing

There is no router library. Navigation is a `useState` string in `App.tsx`. The `viewMap` object maps view keys to lazy-loaded components. To add a tab:

1. Add a lazy import in `App.tsx`
2. Add an entry to `viewMap` in `App.tsx`
3. Add a `navItems` entry in `src/components/AppHeader.tsx`

## Firestore collections

| Collection | Used by |
|---|---|
| `prepItems` | `useKitchenState` |
| `recipes` | `useKitchenState`, `RecipeBuilder` |
| `items86` | `useKitchenState` |
| `handovers` | `useKitchenState` (listener still exists, feature removed) |
| `timers` | `KitchenTimers.tsx` |
| `station_presets` | `useStationPresets`, `Settings.tsx`, `KitchenTimers.tsx` |
| `handover_logs` | Removed (was written by `HandoverLog.tsx`) |

## Design system

- **Background:** `bg-black` / `bg-zinc-950`
- **Borders:** `border-zinc-800` / `border-zinc-900`
- **Text:** `text-zinc-100` primary, `text-zinc-500` muted
- **Accent:** `emerald-400` / `emerald-700` (active states, CTAs)
- **Danger:** `red-400` / `red-950`
- **Font:** `font-mono` throughout; `font-black` + `uppercase` + `tracking-wider` for headings
- **Cards:** `bg-zinc-950 border border-zinc-800 rounded-xl`
- No emojis. No comments explaining what code does.

## AI feature (TestKitchenHub)

Calls `https://api.anthropic.com/v1/messages` directly from the browser using `anthropic-dangerous-direct-browser-calls: true`. Model is `claude-sonnet-4-6`, max 1024 tokens. The API key is `VITE_ANTHROPIC_API_KEY` — never commit it.

## Known pre-existing TypeScript errors

`npm run lint` reports ~60 errors that predate this project. Do not fix them unless that is the stated task. Key categories:

- `useKitchenState.ts` — Firestore namespace types (`FirestoreError`, `QuerySnapshot`, etc.) used as value types; they should be imported from `firebase/firestore` as type-only imports
- `RecipeBuilder.tsx` — references fields (`costPerUnit`, `name`, `unit`, `totalCost`) missing from `RecipeIngredient` and `Recipe` types
- `PrepRegistrationForm.tsx` — `PrepItem.quantity` is `number` in `src/types.ts` but `string` in `useKitchenState.ts` (duplicate interface)
- `data.ts` — seed data doesn't match current type shapes
- `utils.ts` / `IngredientsTable.tsx` — import `Ingredient` which is not exported from `src/types.ts`
- `main.tsx` — `document.getElementById` can return `null`
- `DailyCribSheet.tsx` — `groupedPrep` inferred as `{}` instead of `Record<string, ProductionRun[]>`
- `@/types` path alias unresolved in some files (tsconfig path mapping issue)

## Orphaned / notable files

- **`src/Dashboard.tsx`** — a `DashboardView` component that is never imported. `App.tsx` loads `DailyCribSheet` directly as the dashboard view. This file is dead code.
- **`useKitchenState.ts`** — still subscribes to the `handovers` Firestore collection and returns `handoverLogs`, but nothing consumes it since the Handover Log feature was removed. The listener runs but is harmless.
- **`src/types.ts`** still exports `HandoverLog` interface — leftover from the removed feature, harmless.
