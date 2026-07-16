# Brand v1.1 Migration — Scoping Report

Audit only. No code was changed as part of producing this report.

CLAUDE.md documents brand kit **v1.0** and a "pending" brand-pass queue, but has
no "v1.1" spec — this inventory is built from direct codebase greps against the
repo as of this audit, not from a doc section that doesn't exist yet.

---

## 1. Views/components still on dark zinc/emerald theme

**24 files, 649 occurrences of `zinc-`/`emerald-` Tailwind classes**

- [ ] `Settings.tsx` — 93
- [ ] `Recipes.tsx` — 79
- [ ] `components/events/EventDetailView.tsx` — 65
- [ ] `Staff.tsx` — 55
- [ ] `EventCalendar.tsx` — 52
- [ ] `components/ingredients/InvoicePriceUpdate.tsx` — 33
- [ ] `DailyCribSheet.tsx` — 32
- [ ] `Vendors.tsx` — 30
- [ ] `IngredientsTable.tsx` — 29
- [ ] `KitchenTimers.tsx` — 28
- [ ] `Features.tsx` — 26
- [ ] `components/dashboard/PrepRegistrationForm.tsx` — 22 (only consumer: `PrepChecklist.tsx`)
- [ ] `Menu.tsx` — 19
- [ ] `components/ingredients/IngredientForm.tsx` — 19 (shared by Ingredients add/edit + invoice flow)
- [ ] `PrepChecklist.tsx` — 14
- [ ] `components/StationPassHeader.tsx` — 11
- [ ] `components/dashboard/LineTimerModule.tsx` — 10 — **orphaned, not imported anywhere in `src/`**
- [ ] `GuestMenuPreview.tsx` — 8
- [ ] `components/dashboard/MetricsHUD.tsx` — 7 — **orphaned, not imported anywhere in `src/`**
- [ ] `components/ingredients/AiIngredientLookup.tsx` — 6
- [ ] `components/AlertDialog.tsx` — 5 (shared, consumed by `Recipes.tsx` + `Settings.tsx`)
- [ ] `components/ErrorBoundary.tsx` — 3 (app-wide crash wrapper)
- [ ] `RecipesHub.tsx` — 2 (sub-tab shell only)
- [ ] `lib/costEngine.ts` — 1 — not a view; a pure `fc <= target ? 'text-emerald-400' : ...`
      function, single choke point every FC%-displaying view calls into

**Discrepancy found:** CLAUDE.md's brand-pass note says the Test Kitchen "Menu
Development Playground" sub-tab is still "dark-zinc." A direct check of
`TestKitchenHub.tsx` found zero `zinc`/`slate`/`gray` classes anywhere in the
file — the Playground markup (lines ~596–668) is already on
`bg-surface`/`bg-bg-cool`/`text-navy`/`border-line` tokens. The doc appears
stale on this point; worth confirming against the running app before scoping
v1.1 work here.

---

## 2. Quicksand / Nunito Sans usage

**4 files** carry the font definitions themselves (no component-level
font-family overrides found elsewhere):

- [ ] `src/index.css` — `@theme` tokens `--font-display: 'Quicksand'`,
      `--font-body: 'Nunito Sans'` (source of truth)
- [ ] `index.html` — Google Fonts `<link>` import (both families, weights 400–700)
- [ ] `design-tokens.json` — `typography.fonts.display`/`.body` mirror
- [ ] `CLAUDE.md` — doc reference only

No `font-mono` token currently exists in `design-tokens.json` — a v1.1
addition, not a rename.

---

## 3. `rounded-card` (22px) / `rounded-tile` (28px) usage

**9 files, 43 occurrences** — all in already-brand-kit views (expected; legacy
zinc views use raw `rounded-[Npx]`/`rounded-lg` instead):

- [ ] `TestKitchenHub.tsx` — 19
- [ ] `ChefDashboard.tsx` — 12
- [ ] `components/staff/ScheduleCalendar.tsx` — 3
- [ ] `AppHeader.tsx` — 2
- [ ] `components/SignIn.tsx` — 2
- [ ] `components/recipes/NutritionLabel.tsx` — 2
- [ ] `HistoricalAlerts.tsx` — 1
- [ ] `RecipeCollections.tsx` — 1
- [ ] `components/ingredients/IngredientAdvisor.tsx` — 1

---

## 4. Data numerals that will need `font-mono`

Two distinct buckets — these are not the same work item.

**4a. Legacy blanket `font-mono`** (wraps the *entire page container*, not
scoped to numerals — will need to be stripped and reapplied surgically during
the theme migration): **18 files, 34 usages** — `Recipes.tsx`, `Settings.tsx`,
`Staff.tsx`, `Vendors.tsx`, `Menu.tsx`, `KitchenTimers.tsx`,
`IngredientsTable.tsx`, `Features.tsx`, `EventCalendar.tsx`,
`DailyCribSheet.tsx`, `StationPassHeader.tsx`,
`components/ingredients/InvoicePriceUpdate.tsx`,
`components/ingredients/IngredientForm.tsx`,
`components/events/EventDetailView.tsx`, `components/ErrorBoundary.tsx`,
`components/dashboard/PrepRegistrationForm.tsx`, `PrepChecklist.tsx`,
`components/dashboard/LineTimerModule.tsx` (orphaned).

**4b. Already brand-kit views with numerals still in plain body font**
(net-new `font-mono` scoping needed):

- [ ] `ChefDashboard.tsx` (shift/event times, `formatTime12h` ×3)
- [ ] `components/staff/ScheduleCalendar.tsx` (shift times ×3 + Weekly Hours
      strip figures)
- [ ] `components/recipes/NutritionLabel.tsx` (FDA amounts/%DV, `toFixed` ×1)
- [ ] `HistoricalAlerts.tsx` (alert timestamps)

Supporting counts: `.toFixed(` — 33 across 13 files; `formatTime12h(` — 15
across 7 files; `formatDuration(`/countdown — 3 files (`KitchenTimers.tsx`,
`LineTimerModule.tsx` orphaned, `utils.ts`).

---

## 5. Hardcoded brand strings ("MiseOS" / "The Pass")

**13 files total.**

Runtime/UI-visible (a rename touches these directly):

- [ ] `components/AppHeader.tsx` — 1 ("MISEOS" nav badge)
- [ ] `components/StationPassHeader.tsx` — 1 ("MiseOS" + "THE PASS" badge)
- [ ] `components/SignIn.tsx` — 1 ("The Pass" badge)
- [ ] `components/ErrorBoundary.tsx` — 2 (console log + fallback title)
- [ ] `lib/advisorPersona.ts` — 1 (AI system-prompt text)
- [ ] `lib/sousPersona.ts` — 1 (AI system-prompt text)
- [ ] `lib/app-params.js` — 3 (`systemName`, `name`, `logoAlt`) — **orphaned,
      not imported anywhere; also the only `.js` file in an otherwise
      `.ts`/`.tsx` codebase**
- [ ] `server.ts` — 2 (startup console banners)

Non-runtime (config/docs, still in scope for a rename):

- [ ] `index.html` — page `<title>`
- [ ] `design-tokens.json` — `meta.description`
- [ ] `README.md` — title heading
- [ ] `CLAUDE.md` — pervasive, self-referential
- [ ] `.vscode/settings.json` — stale Gemini-era rules block ("You are the
      MiseOS Architect...") that also referenced `Master_Feature_Manifest.txt`
      / `Firestore_Schema.txt` / `MiseOS_Philosophy.txt` — files already
      deleted in the Gemini-scaffold purge (b8a1ba7). Broken independent of
      any rename; removed as an unrelated cleanup alongside this report (see
      commit).

---

## Category totals

theme 649 (24 files) · fonts 4 files · radii 43 (9 files) · numerals ~70
candidate sites (13+ files, split legacy/net-new) · brand strings 13 files.
