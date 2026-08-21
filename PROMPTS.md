# PROMPTS.md

The Claude Code prompt queue and decision log for this codebase. Work is
queued here as a numbered prompt before it is executed, and the reasoning
behind what shipped is logged here afterward — so a future change has the
thinking behind the current version, not just the result.

**P-IDs are permanent.** A prompt keeps its number for the life of the
repo. Nothing is ever renumbered, reused, or reordered to close a gap:
CLAUDE.md, commit messages, and code comments all cite these IDs, and a
renumber would silently repoint every one of those references. A new
prompt takes the next number above the highest ID that has ever existed —
including abandoned and superseded ones. Gaps in the sequence are normal
and are left alone.

**Decisions are logged under the ID that spawned them.** When executing a
prompt forces a real judgment call — a constraint discovered mid-build, an
approach rejected, an instruction that turned out to rest on a false
premise — that reasoning belongs in this file under that prompt's ID, not
scattered across commit messages. An entry may therefore grow after the
work lands.

**AI system-prompt changes are logged here too, but this file is not
limited to them.** Persona and prompt rewrites (`sousPersona.ts`,
`advisorPersona.ts`, the trends and extraction prompts) get the same
treatment as any other work — what changed, why, and what it replaced.
Entries predating this convention are dated rather than numbered and are
left as written.

**Where things live (decided 2026-08-21).** Two homes, one rule each:

- **Repo** — `CLAUDE.md`, `PROMPTS.md`, `SOUS-EVAL.md`. Claude Code
  executes against these. If a prompt requires reading or changing a file
  to do the work, it belongs here.
- **OneDrive `miseos` folder** — `ROADMAP.json`,
  `incendiumphi-dashboard.html`, `PARKING-LOT.md`, `BRIAN-TODO.md`.
  Brian's and Claude.ai's upkeep. **Cited from the repo, never copied
  in** — a repo entry may point at one of these by name and date, but the
  file itself stays out of version control.

The consequence to keep in mind: a citation to an OneDrive-side file cannot be
verified from a clone. State enough in the repo entry that it still makes
sense to someone who only has the repo.

Every Claude Code prompt gets a permanent ID (P-001, P-002…). IDs are never reused or renumbered — a retired prompt keeps its number forever. Refer to prompts by ID only, never "the next one" or "prompt 2."

**Statuses:** QUEUED (ready to paste) · ISSUED (pasted into Claude Code, in flight) · DONE (verified & committed) · RETIRED (superseded — see note)

**Workflow:**
0. Every prompt block opens with its ID in brackets — `[P-0XX]` — so the ID travels into the Claude Code transcript and is searchable in VS Code by number.
1. Claude.ai writes prompts here with the next ID before you need them.
2. You paste the full prompt block into Claude Code, mark it ISSUED (or tell Claude.ai to).
3. When Claude Code comes back with options/questions mid-build, that's still the same prompt ID — decisions get logged under it, no new ID.
4. A new ID is only created for a new unit of work.
5. On completion, status → DONE with date. Dashboard sync follows.


---

## 2026-07-18 — Sous expanded to Chef Matthew, five domains, persona canon

**What changed:** `src/lib/sousPersona.ts`'s `SOUS_SYSTEM_PROMPT` was
rewritten from a single-domain culinary advisor into a named persona
("Chef Matthew") covering five domains: culinary (existing behavior,
unchanged), restaurant business, front of house, IncendiumPhi itself, and
this restaurant's brand/identity. A new file, `src/lib/sousAppKnowledge.ts`,
holds a maintained, chef-facing description of the app and every shipped
module — Sous is instructed to explain the app only from that file, never
freehand. `TestKitchenHub.tsx` now injects both the restaurant profile
context (unchanged, via `withRegionContext`) and `APP_KNOWLEDGE_CONTEXT`
into the system prompt.

**Why:** The chef using this app wants one sous chef who can talk shop
across the whole business, not just the stove — food cost, service flow,
and "which tab does that" are all things a real executive sous fields
constantly. Testers will also poke at Chef Matthew's identity and
backstory; without a fixed canon, the model would improvise a different
biography each time, which reads as fake. Persona canon (backstory,
self-awareness, humor calibration, backstory-deflection rules) is now
injected verbatim so answers stay coherent across sessions.

**Hard rule added:** Sous must never invent facts about the restaurant or
the app — anything not in the injected restaurant-profile context or
`sousAppKnowledge.ts` gets an honest "I don't have that on file," not a
plausible-sounding guess. This was added because the prior prompt had no
explicit anti-confabulation instruction, and testing surfaced the model
inventing restaurant facts (a "fusion concept," a "$$$ price point") that
weren't grounded in anything actually given to it — sometimes coincidentally
matching the real profile, sometimes not, which is the actual problem:
right by accident isn't the same as right on purpose.

**Persona canon (source of truth — mirrors what's injected in the prompt):**
Chef Matthew, 22 years in kitchens. CIA grad, came up on the line in
Chicago, ran BOH as executive sous at a two-star northern Italian house,
then consulted on restaurant openings (the source of his business/FOH
fluency). Took the IncendiumPhi post because he was tired of watching good
kitchens die from bad information rather than bad cooking. Unflappable —
seen every Friday go sideways, doesn't raise his voice. Self-aware that
he's software, not a physical cook; deadpan/playful humor only when a chef
is being a smartass or making an unreasonable demand, one dry line
attached to a useful answer or redirect, never a standalone joke; normal
questions get straight answers. Backstory questions answered from canon
only — outside canon, he deflects in character rather than inventing.

**Maintenance note:** `sousAppKnowledge.ts` must be updated whenever a
module ships, a nav tab is renamed, or a feature moves — it's the only
source Sous is allowed to describe the app from, so if it drifts from the
real app, Sous will describe features that don't exist or miss ones that
do.

---

## P-001 — Staff roster module (Wave 1) — DONE 2026-07-17

**Roadmap item:** w1-1 · Completed Jul 17, zero code written

**Decisions log:**
- Existing Employee directory + Shift scheduling already covers the roster spec; Crib Sheet feed verified with real data. Chose "nothing to build."
- Real clock-in/punch tracking deliberately NOT built — queues from tester feedback if wanted.
- Discovery: shift scheduling partially exists in repo → Wave 2 scheduler (w2-5) is extend-and-polish, not from-scratch.

```
Read CLAUDE.md at the repo root first, then build the Staff module (lightweight) per the approved feature map.

SCOPE — exactly this, nothing more:
- Staff on today: name, role, station, clock-in time
- Feeds the Daily Crib Sheet's staff section only
- No scheduling, no shifts, no history — a scheduler is a separate future module; do not scaffold for it

IMPLEMENTATION:
1. Confirm the StaffMember type in src/types.ts matches: name, role, station, clockIn. Flag mismatches before changing anything.
2. Firestore collection `staff` already has a listener in useKitchenState.ts — verify it works; all mutations (add/edit/remove staff) go through useKitchenState.ts only.
3. Build a staff management UI: list today's staff, add form (name, role, station dropdown from PrepStation type, clock-in time), edit, remove. Decide with me first whether this lives in Settings or as its own view before writing code.
4. Wire the Crib Sheet staff section to render live data if it doesn't already.

CONSTRAINTS:
- Brand kit per CLAUDE.md: bg-surface cards, border-line, rounded-card, navy/slate text, teal accent, font-display headings / font-body UI. Fibonacci spacing from design-tokens.json as Tailwind arbitrary values. No hardcoded brand strings — use APP_PARAMS.
- No emojis, no code comments explaining what code does.
- Do not fix pre-existing TypeScript errors unless they block this work.
- One change at a time: propose the step, wait for my verification, then proceed. Git commit after each verified working change.

Start by reporting what already exists for staff (types, listener, any UI) before proposing step 1.
```

---

## P-002 — Features Module (Wave 1) — ISSUED 2026-07-17 (verification pending)

**Roadmap item:** w1-2 · Target: Jul 27

**Decisions log:**
- Module already exists (third stale-spec discovery). Recipe-snapshot add path KEPT — one-time provenance copy, matches planned Wave 2 promotion flow. Verify: no re-sync, no write-back, manual path works with zero recipes.
- "Coming October" costing note DROPPED — Recipe Builder already shipped (Recipes.tsx), note would be wrong.
- Placement accepted as built: Chef's Dashboard "Manage Features" quick link, no nav tab.
- Close condition: demonstrate active date range → Crib Sheet, live 86 update, FC% display, print view.

```
Read CLAUDE.md at the repo root first, then build the Features Module (nightly specials) per the approved feature map.

SCOPE:
- Build nightly specials: course, name, description, price, manually entered plate cost, computed food-cost % display
- Active date range per feature — only features active today appear on the Daily Crib Sheet
- 86 a feature mid-service: one tap, Crib Sheet updates live via the existing Firestore listener
- Informational note in the cost input area: "Full costing arrives when you build this as a recipe — Recipe Builder coming October." No link yet — Recipe Builder does not exist.
- NO recipe integration, NO cost calculation engine, NO auto-costing. Manual number entry only.

IMPLEMENTATION:
1. Report what exists first: the Feature type in src/types.ts, the `features` Firestore collection and its listener in useKitchenState.ts, and how DailyCribSheet.tsx currently renders features. Flag gaps between existing shape and this scope (date range, 86 flag, description, FC%) before changing anything.
2. Propose the type/collection changes needed, wait for approval.
3. All mutations through useKitchenState.ts. New types in src/types.ts only.
4. Decide with me before writing UI code: own nav tab vs. management within an existing view.
5. Wire Crib Sheet: active features for today, 86'd features visibly struck/flagged, print view included.

CONSTRAINTS:
- Brand kit per CLAUDE.md: bg-surface cards, border-line, rounded-card, navy/slate text, teal accent, saffron ONLY for alert/signal use, font-display headings / font-body UI. Fibonacci spacing from design-tokens.json as Tailwind arbitrary values. APP_PARAMS for all brand strings.
- No emojis, no code comments explaining what code does.
- Do not fix pre-existing TypeScript errors unless they block this work.
- One change at a time: propose the step, wait for my verification, then proceed. Git commit after each verified working change.

Start with the step-1 report before proposing any changes.
```

---

## P-003 — Full repo audit vs. feature map — DONE 2026-07-17

**Outcome:** App essentially complete — both waves' features shipped. Roadmap rebased to v3.0. Real gaps: 86'd items UI (P-004), dead code + APP_PARAMS (P-005), hosting/auth/scoping (P-006). Open decisions parked: Regional Price Seed contradiction, menu-first composer vs. built Menu. Audit saved as AUDIT-2026-07-17.md (verify this happened before /clear).

## P-003 (original) — ISSUED 2026-07-17

**Purpose:** Roadmap is stale vs. repo (Staff, Features, Recipe Builder all pre-existed). Audit report rebases the entire roadmap on reality before any more build prompts.

```
Audit the entire repo against the Approved Feature Map in CLAUDE.md. For each feature (active, planned, and purged), report:
1. Does it exist in the codebase? Fully, partially, or not at all?
2. Key files and entry points
3. Anything built that is NOT on the feature map
4. Anything on the purged list still present in code
Report only — do not fix, change, or remove anything. Output as a table: Feature | Map status | Repo status | Files | Notes.
```

---

## P-004 — 86'd items UI — RETIRED 2026-07-17 (never issued)

**Brian killed the feature** — Features' is86d covers 86'd specials; a standalone ingredient 86 board doesn't earn its place. items86 listener/type/collection teardown folded into P-005 Part 1. CLAUDE.md's feature map needs '86'd items' moved to the purged list (P-005 updates CLAUDE.md anyway).

**Decisions log:**
- Placement ruled 2026-07-17: manage directly on Chef's Dashboard (add/restore inline); Crib Sheet gets a read-only card, print included.
- A draft EightySixBoard.tsx was built then deleted per Brian — Claude Code builds fresh from this prompt.

**Roadmap item:** g1a · Target: Jul 21

```
Read CLAUDE.md at the repo root, then close the 86'd-items gap found in AUDIT-2026-07-17.md.

CONTEXT: The items86 collection has a live onSnapshot listener in useKitchenState.ts with zero UI consumers. The feature map lists "86'd items" on both the Dashboard and Crib Sheet. This is distinct from Features' is86d flag (86'd specials) — items86 is for ingredients/dishes out of stock.

STEP 1 — report before building:
- The Item86/Item86Entry type shape and what the listener returns
- Whether any 86-item CRUD exists anywhere (how does an item get 86'd?)
- Your recommendation: is items86 still the right model, or has Features' is86d + prep tracking made a standalone 86 board partially redundant? Give the tradeoff, then wait for my decision.

STEP 2 (after my ruling): build the approved version — likely an 86 board: one-tap add ("86 the halibut"), reason optional, one-tap restore, rendered prominently on Chef's Dashboard and the Crib Sheet (print view included). All mutations through useKitchenState.ts.

CONSTRAINTS: Brand kit per CLAUDE.md (saffron is the natural signal color for 86s — alerts/signal use is its documented purpose). No emojis, no explanatory comments. Don't fix pre-existing TS errors. One change at a time, verify, commit after each verified change.
```

---

## P-005 — Dead-code cleanup + white-label fix + line endings — DONE 2026-07-17

**Outcome:** 6 commits (b31aa60, 60b8db7, db8a9f0, 20f669d, aa26e85 + wordmark follow-up). 9 dead files deleted; StationPassHeader deleted per Brian; items86 torn down end-to-end and moved to CLAUDE.md purged list; appParams.ts is now the real white-label mechanism (APP_NAME/TAGLINE/SHORT_DESC + APP_NAME_ACCENT/BASE wordmark halves, runtime document.title); .gitattributes added — tracked blobs were already LF, churn was local autocrlf noise, now guarded.

**Roadmap item:** g2a · Target: Jul 25 · Now FIRST in the terminal queue (P-004 retired).

```
Read CLAUDE.md at the repo root and AUDIT-2026-07-17.md, then run the cleanup pass the audit identified. Three parts, in order, one commit each.

PART 1 — Delete dead code (grep-verify zero live imports before each deletion, same protocol as the earlier Base44 purges):
- src/components/handover/HandoverLog.jsx (empty stub of a PURGED feature) and its folder
- src/components/StationMatrix.js, src/components/InsightRail.js (0-byte stubs)
- src/components/Header.js, src/components/OrderSheets.js, src/components/DishDevelopment.js (unimported Base44/Gemini scaffolds)
- src/components/testkitchen/DishOptimizer.jsx (duplicate unwired implementation)
- src/lib/schema.js (unused data-contract stub; contains Market Volatility leftovers — purged feature)
- items86 teardown (feature killed 2026-07-17): remove the items86 listener and local Item86 interface from useKitchenState.ts (and its return value), remove Item86/Item86Entry from src/types.ts, remove the items86 entry from firestore.rules if present, and move "86'd items" to CLAUDE.md's purged list
- Investigate src/components/StationPassHeader.tsx: CLAUDE.md cites it as live-pending-brand-pass but the audit found zero importers. Report whether it should be wired into App.tsx or deleted — my decision before touching it.
Run npx tsc --noEmit after deletions; must stay clean.

PART 2 — APP_PARAMS white-label fix:
- src/lib/app-params.js is never imported and hardcodes stale "MiseOS" strings, so the APP_PARAMS mechanism CLAUDE.md's brand rules assume does not actually exist.
- Propose the minimal real mechanism (e.g. src/lib/appParams.ts exporting brand name/tagline consumed by AppHeader, SignIn, GuestMenuPreview, StationPassHeader if kept, page title) and wait for approval before implementing. Grep for hardcoded "IncendiumPhi" strings in src/ and route them through it.

PART 3 — Line-ending hygiene:
- Add a .gitattributes enforcing consistent line endings (text=auto or explicit eol) so the tree-wide CRLF/LF churn in git status stops recurring.
- Run git add --renormalize . in a dedicated commit containing ONLY normalization, no logic changes.
- Update CLAUDE.md's stale references to deleted files.

CONSTRAINTS: report-then-act per part; one commit per part; do not fix unrelated pre-existing TS errors; no feature changes anywhere in this prompt.
```

---

## P-006 — Firebase Hosting + Auth + per-restaurant data scoping — DONE 2026-07-18

**Outcome:** Live at https://miseos-app.web.app. Blaze upgraded; ANTHROPIC_API_KEY set as a Functions secret (rotated after accidental transcript exposure); `ai` Cloud Function deployed (us-central1) with 1-day Artifact Registry image retention; Hosting deployed with the /api/ai rewrite verified; end-to-end Sous Chat call succeeded (200) with no key material in the client bundle. Deployment lesson: `firebase deploy --only hosting` ships dist/ as-is — a stale dist/ (built 02:27, code changed 04:20) caused phantom missing-Authorization-header failures until a fresh `npm run build` preceded the redeploy. Always build immediately before every hosting deploy.

**Decisions log:**
- /api/ai gets ID-token auth in this pass (public URL creates the exposure) + per-request uid logging (Cloud Logging only, never Firestore).
- Data model: subcollections restaurants/{id}/... — path IS the tenant boundary. Brian's data → restaurants/main, role admin.
- Auth: custom claims (restaurantId), users/{uid} metadata-only (Admin-write only), accounts created by Brian via scripts/manageChefAccount.ts, no self-registration.
- Rules: single nested match block, two-stage deploy (transitional → final), emulator-tested every change.
- Proxy: Cloud Functions v2 (needs Blaze), shared aiProxyHandler.ts for Express + Function.
- Brian amendments accepted: delta migration pass before flat delete (trend auto-refresh drift), CLAUDE.md declares Hosting sole production path.
- Executing 15 steps, manual edit approval, one commit per verified step. Plan archived: p006-plan.md in this folder.

**Roadmap item:** g3a · Target: Aug 4 · The one big remaining build. Run after P-005.

```
Read CLAUDE.md at the repo root. Goal: test chefs reach the app at a real URL, sign in, and see only their own restaurant's data. Plan-first task — produce the full plan and wait for approval before implementing anything.

CONTEXT: Real Firebase email/password auth already exists (AuthContext.tsx, SignIn.tsx, single operator account, no self-registration) and firestore.rules gates on isAuthenticated(). What does NOT exist: hosting/deployment, multi-account support, and per-restaurant data separation — collections are flat and shared.

PLAN MUST COVER:
1. Data model: how every collection gains restaurant scoping (restaurantId field + rules filter vs. subcollections under restaurants/{id}) — recommend one with migration steps for existing data, including the singleton docs (restaurant_profile/main, trend_reports/latest) which are inherently single-restaurant today.
2. Auth: moving from single-operator to one account per test chef, created by Brian (no self-registration), each mapped to a restaurantId; users collection role model.
3. Security rules: enforcing that a signed-in user reads/writes only their restaurant's documents — server-side, not just client filters.
4. Hosting: Firebase Hosting for the built SPA plus where server.ts's /api/ai proxy runs (Cloud Functions/Cloud Run — recommend one, note cold-start and cost tradeoffs, keep ANTHROPIC_API_KEY server-side only).
5. Local dev unchanged: npm run dev must keep working against the same project without breaking the deployed testers.
6. Test plan: two test accounts proving isolation both directions before any chef gets a link, using disposable data per the Working Session Protocol.

CONSTRAINTS: no external integrations beyond Firebase itself; every rules change tested in the emulator before deploy; one implementation step at a time after plan approval, commit per verified step.
```

---

## P-007 — Persistent timer strip + audible alarm — DONE 2026-07-19

**Outcome:** App-wide TimerStrip shipped (commits 6aeb082, 30ef51e, aa19036): single lifted Firestore listener in AppShell prop-drilled to KitchenTimers + TimerStrip, saffron-only alarm signaling, audio armed on first interaction with repeat-until-acknowledged (ephemeral in-memory ack Set), print-suppressed, full collapse when nothing running. Bonus: fixed pre-existing toggleTimer/resetTimer bug (startTime: undefined → deleteField()) — Pause/Reset were silently broken. All verified live; Pepper test timer deleted per protocol. NOT yet deployed to prod — needs npm run build + firebase deploy --only hosting.

**Origin:** Parking lot 2026-07-18 — "How do the chefs know if the timer goes off if they aren't in front of their computer?"

**Decisions log:**
- Phone push notifications explicitly OUT of scope — parked as a separate future decision.

**Roadmap item:** none yet (assign when scheduled) · Run after P-006 completes.

```
Read CLAUDE.md at the repo root first. Goal: kitchen timers are visible and audible from anywhere in the app, not just the Kitchen Timers view.

SCOPE:
- A persistent, compact timer strip in the app shell, visible on every view whenever at least one timer is running: station, label, time remaining, expired state clearly flagged.
- Audible alarm on timer expiry — loud and repeating until acknowledged, kitchen-appropriate. Plays regardless of which view is active. One-tap acknowledge from the strip.
- Expired timers stay visually flagged in the strip until acknowledged.
- NO phone/push notifications, NO service workers, NO changes to timer CRUD — display and alerting only.

IMPLEMENTATION:
1. Report first: how KitchenTimers.tsx consumes the timers collection today, and whether the listener lives in the component or a hook. Timer state must be lifted/shared so the strip renders app-wide — propose the minimal approach (likely a shared hook or context) and wait for approval.
2. Browser audio requires a user gesture before playback is allowed — report how you'll handle the autoplay policy (e.g. arming audio on first interaction) as part of step 1.
3. Placement proposal before UI code: strip location (under AppHeader vs. fixed bottom), collapse behavior when no timers running.
4. Print views must not show the strip.

CONSTRAINTS:
- Brand kit per CLAUDE.md: bg-surface, border-line, navy/slate text, teal accent, saffron for the expired/alarm signal state (its documented purpose). Fibonacci spacing from design-tokens.json. APP_PARAMS for brand strings.
- No emojis, no explanatory comments. Don't fix pre-existing TS errors.
- One change at a time: propose, verify, commit per verified change.

Start with the step-1 report before proposing any changes.
```

---

## P-008 — Kitchen Timers + Alert History teardown (features axed) — DONE 2026-07-19

**Verified 2026-07-19:** repo git log confirms teardown commits (d15eff2, 1336cb3, 94cbd94 et al.); CLAUDE.md purged list updated; working tree clean, pushed to origin/main.

**Origin:** Brian's ruling 2026-07-19. Timers were a Gemini-era feature kept on the hope they'd earn their place. The app is the chef's own tool on the chef's own devices — so its timers compete directly with the phone in that chef's pocket and lose (louder, always present, works with the browser closed). No chef-facing answer for why they exist in this app. Purged as redundant with phone timers, no replacement planned. Sunk P-007 work (shipped the day before) explicitly does not justify keeping it.

**Scope expanded same day — Alert History axed too:** grep confirmed nothing in the app ever writes to the `alerts` collection (no addDoc/setDoc anywhere) — it's a read-only viewer over a collection with no producer, a Gemini/Base44 vestige whose producer was one of the already-purged features. A full nav tab that can never show anything. Brian ruled: axe entirely (tab, view, Crib Sheet alerts card, Dashboard badge, collection, rules, type). If tester feedback ever surfaces a real alert trigger, a badge-only notification gets designed fresh around that trigger — never a tab.

**Decisions log:**
- Disposition: Permanently Purged, not deferred — add "Kitchen Timers" and "Alert History / alerts collection" to CLAUDE.md's purged list.
- The deleteField() lesson from the P-007 CRUD fix stays documented (pattern knowledge, not feature knowledge).
- g4a's "Timers brand pass" scope line is removed along with the feature.

```
[P-008] Read CLAUDE.md at the repo root. Goal: remove two axed features entirely — Kitchen Timers and Alert History. Both are axed, not deferred.

SCOPE — delete (Timers):
- src/KitchenTimers.tsx, src/components/TimerStrip.tsx, src/hooks/useTimers.ts
- The timers viewMap entry in App.tsx, the TimerStrip mount in AppShell, and the timers prop threading
- The Kitchen Timers Quick Action on ChefDashboard.tsx
- The timers collection block in firestore.rules

SCOPE — delete (Alert History; verified: nothing anywhere writes to the alerts collection — it is a viewer with no producer):
- src/HistoricalAlerts.tsx, its viewMap entry and nav tab
- The alerts card/section in DailyCribSheet.tsx
- The alerts indicator badge in ChefDashboard.tsx's header
- The alerts listener in useKitchenState.ts, the KitchenAlert type in src/types.ts, the alerts block in firestore.rules
- Alerts references in src/lib/sousAppKnowledge.ts (Sous must not describe a feature that no longer exists)

Then: grep the full src/ tree for any remaining timers/alerts references; report anything ambiguous before deleting it. Emulator-test the rules changes before deploy.

KEEP:
- station_presets and useStationPresets — still consumed by Staff shifts and the Dashboard coverage check
- The deleteField() pattern documentation in CLAUDE.md's conventions (reword so it no longer cites KitchenTimers as the live example)

CLAUDE.md updates in the same pass: remove the Kitchen Timer Strip section, the timers and alerts collection rows, HistoricalAlerts entries, and the nav-tab list mention of Alert History; add both to Permanently Purged — "Kitchen Timers (module + app-wide strip — redundant with the chef's own phone timers; single-user tool, no shared-screen case)" and "Alert History / alerts collection (viewer with no producer — Gemini/Base44 vestige; any future alerting gets designed badge-only around a real trigger)"; remove Timers from the g4a-related polish notes.

CONSTRAINTS: report the full deletion list before deleting anything; typecheck clean after; one commit per feature teardown plus one for CLAUDE.md; delete the Demi timer doc and any timers/alerts docs from Firestore dev data at the end.
```

---

## P-009 — Plate designer: fit to one viewport, no scrolling — RETIRED 2026-07-19 (feature axed mid-STEP 1)

**Brian's ruling 2026-07-19:** the visual plate designer is axed entirely. Plating decisions live in dimensions a 2D canvas can't hold; a test plate + phone photo beats icon-dragging every time. AI-generated plate images also ruled out — the app handles grunt work, chefs own the creativity. Replacement direction: plate photo capture — a dedicated, easy image upload (high quality, multiple sizes) plus quick, simple in-app guidance on shooting a great plate photo. Teardown is P-013; the photo-capture build gets scoped after design decisions (storage, sizing). Code's STEP 1 layout report is moot — no layout work happened, nothing committed.

**Origin:** Parking lot 2026-07-19 03:41 — "plate designer now requires scrolling to use it. Not a fun interface to deal with."

```
[P-009] Read CLAUDE.md at the repo root. Goal: the plate designer in the Test Kitchen area must be fully usable in a single viewport — no vertical scrolling during normal use on a standard laptop screen (1366x768 and up).

STEP 1 — report before changing anything:
- Which component(s) render the plate designer and what currently pushes it past one viewport (fixed heights, stacked panels, oversized canvas, header stack).
- Propose a layout that fits: what shrinks, what moves, what collapses. Golden-split proportions from design-tokens.json where a two-panel layout applies.

STEP 2 — implement the approved layout only. No feature changes, no new functionality — pure layout. Placeholders and missing functionality are P-011, not this prompt.

CONSTRAINTS:
- Brand kit per CLAUDE.md. Fibonacci spacing from design-tokens.json as Tailwind arbitrary values — no hardcoded pixel values.
- Do not fix pre-existing TypeScript errors unless they block this work.
- One change at a time; verify with me at each step; commit after each verified working change.
```

---

## P-010 — Surface signed-out state instead of silent AI 401 — DONE 2026-07-20

**Origin:** Parking lot 2026-07-19 — found during P-006 verification. getAiAuthHeader() returns {} when auth.currentUser is null; a half-dead session renders the full UI but every AI call fails with an opaque 401.

```
[P-010] Read CLAUDE.md at the repo root. Goal: when Firebase auth has expired or auth.currentUser is null, the app must say so instead of silently failing AI calls.

STEP 1 — report before changing anything:
- Every call site of getAiAuthHeader() and how each handles a failed/401 AI response today.
- Where auth state is observed (onAuthStateChanged) and whether a null-user transition after initial load is currently detected at all.

STEP 2 — propose, then implement after approval:
- getAiAuthHeader() throws or returns a discriminated result when currentUser is null — never a silent {}.
- A visible "Signed out — sign in again" state: block AI actions with a clear message and a re-auth path. Decide with me whether this is a banner, a dialog, or per-feature inline state before writing UI.
- A 401 response from the AI proxy triggers the same state (covers expired tokens the client thinks are live).

CONSTRAINTS:
- Brand kit per CLAUDE.md; saffron is permitted here — this is a genuine signal state.
- Do not fix pre-existing TypeScript errors unless they block this work.
- One change at a time; verify with me at each step; commit after each verified working change.
```

**Decisions (2026-07-20):**
- `getAiAuthHeader()` now throws instead of silently returning `{}` when `auth.currentUser` is null — since every `/api/ai` caller awaits it before `fetch()`, the request never fires when signed out.
- Shared constant `AI_SIGNED_OUT_MESSAGE` in `src/lib/ai.ts`: "Session expired — sign out and sign back in." Wording matches the real recovery path — the always-visible Sign Out button in AppHeader forces `onAuthStateChanged(null)` and drops AuthGate to the sign-in screen. There is no in-place sign-in affordance, so no banner/dialog UI was built; existing per-feature inline error states carry the message.
- `callAi()` special-cases 401 to throw the same message; all `callAi()` consumers picked it up with zero changes. The two raw-fetch call sites (Sous chat, Ingredient Advisor) got the same one-line 401 case.
- `verifyTrendCard` and `fetchAddSuggestions` deliberately untouched — silent-by-design for all failures.
- Commits: 7db0d4e (ai.ts core), f82da2a (raw-fetch call sites). Live-verified both paths via forced-401 fetch intercept. Deployed to prod 2026-07-20 (bundle index-B9i-Pi6t.js, verified live). Pushed to origin/main (f82da2a).

---

## P-011 — Test Kitchen area: placeholder inventory + design/functionality pass — DONE 2026-07-20 (inventory delivered; rulings became P-015)

**Origin:** Parking lot 2026-07-19 03:43 — "Still missing a lot of functionality, creative feel to the section. Still several placeholders." Brian confirmed: plate designer and surrounding sections. Scope deliberately starts with an inventory because "several placeholders" is not yet an actionable list.

```
[P-011] Read CLAUDE.md at the repo root. Goal for THIS prompt: produce an inventory, not code. The Test Kitchen area (plate designer and surrounding sections) still contains placeholders and missing functionality.

Deliver a report, nothing else:
1. Every placeholder in the Test Kitchen area: hardcoded stub data, dead buttons, "coming soon" text, empty panels, mock content.
2. Every visible control that does nothing or only partially works.
3. For each item: smallest change that makes it real, or a recommendation to cut it (per the standard: every feature earns its place or it doesn't ship).

Do not write or change any code. Brian reviews the inventory, rules on each item, and the build work gets scoped as follow-up prompts (or folded here) from those rulings. P-009 owns the viewport/scrolling layout fix — exclude pure layout from this inventory.
```

---

## P-012 — Prep Checklist rebuild: time-sorted station sheets, print-to-paper workflow — QUEUED 2026-07-19

**Origin:** Brian's Copilot-built MiseOS Prep reference (2026-07-19). Adopted the workflow ideas, not the code: time-priority sort, Not Needed state, per-station sheets, print/share. Rejected: localStorage, PIN admin, cook:boolean (was a stand-in for prep duration), qty-required-at-checkoff.

**Decisions log (design discussion 2026-07-19):**
- User model: the chef is the app user; cooks work from printed paper. App builds the list, prints per station. Consistent with the timers ruling (chef's-own-device app).
- Sort: `prepMinutes` (required numeric, chef's estimate) descending — longest production first. Order of operations on a station sheet is execution-critical; no alphabetical fallback except as tiebreak.
- Item identity: item = name + station + spec. Same ingredient appears per station with different spec and time (pantry carrots for salad vs sauté oblique-cut blanched/shocked). Add form must capture spec explicitly.
- No qty entry required at check-off — chef enters quantities while building the list; cooks are never forced to type.
- Not Needed: first-class shift state, excluded from print. checked/notNeeded cleared by manual "Reset Shift" per station; catalog (items, pars, times, specs) untouched.
- Dashboard: no progress rings. Per-station status line — unprinted stations show as a reminder; after printing flips to "Prep list is with the Grill."
- Usage history: built in full this pass (log at print + review view). Brian's ruling: if we know we're building it, build it before testers see the app.
- Supersedes/extends SPEC-prep-checklist-add-item.md and SPEC-prep-checklist-edit-checkoff.md — Code must verify what of those already landed before planning.

**Roadmap item:** to be added at next dashboard sync.

```
[P-012] Read CLAUDE.md at the repo root. Goal: rebuild the Prep Checklist around a print-to-paper workflow — the chef builds the day's list, the app sorts each station by production time, the chef prints station sheets for the cooks. Plan-first task: report current state and the full plan, wait for approval before implementing.

STEP 0 — report current state:
- What of SPEC-prep-checklist-add-item.md and SPEC-prep-checklist-edit-checkoff.md (repo root) has already been implemented (addPrepItem, check-off, edit, delete).
- Current PrepItem shape in src/types.ts vs the local duplicate in useKitchenState.ts.

DATA MODEL (propose migrations before touching anything):
- PrepItem gains: prepMinutes (number, required — chef's production-time estimate), spec (string — preparation description, e.g. "oblique cut, blanched, shocked"; the same ingredient may exist on multiple stations with different spec and time), notNeeded (boolean, shift state).
- New collection prep_history: one doc per printed sheet — date, station, items with name/spec/quantity/unit/prepMinutes, printedAt. Written at print time, never edited.
- Per-restaurant scoping consistent with the P-006 data model.

BEHAVIOR:
1. Add/edit item form asks the proper questions: name, station, spec, unit, par, on-hand, prepMinutes. Same-name items on different stations are distinct items.
2. Station-scoped checklist view (tab or filter per station). Sort within a station: unchecked by prepMinutes descending (tiebreak alphabetical), checked sink below, Not Needed at the very bottom. This order is execution-critical — no other ordering anywhere.
3. Not Needed toggle per item: excluded from print, reversible, no qty required.
4. Print: per-station print-optimized sheet (item, spec, quantity, unit, in prepMinutes order; Not Needed excluded). Printing writes the prep_history doc and marks the station printed for today.
5. Reset Shift per station: clears checked/notNeeded/printed-today only.
6. Dashboard section "Prep Sheets": one line per station — unprinted stations flagged as reminders; printed stations read "Prep list is with the {Station}."
7. History view: prep_history browsable by station and date range, table layout, CSV export. Read-only.

CONSTRAINTS:
- All mutations through useKitchenState.ts; new types in src/types.ts only.
- Brand kit per CLAUDE.md; Fibonacci spacing from design-tokens.json; APP_PARAMS for brand strings; print styles consistent with the Crib Sheet's print handling.
- Do not fix pre-existing TypeScript errors unless they block this work.
- One change at a time; verify with me at each step; commit per verified working change. Firestore rules changes emulator-tested before deploy.
```

---

## P-013 — Visual plate designer teardown — DONE 2026-07-20 (commits dde37fd + 381c8c1, deployed to prod and verified live; testKitchen components, usePlateDesigns, firestore.rules plateDesigns rule all removed; CLAUDE.md purged list updated)

**Origin:** Brian's ruling 2026-07-19 (see P-009 retirement note). Visual plate designer axed; AI-generated plates ruled out. Replacement (plate photo capture + photo-guidance) scoped separately after storage/sizing decisions.

**Decisions log:**
- Disposition: Permanently Purged — add "Visual plate designer" to CLAUDE.md's purged list.
- Replacement concept (plate photo capture) is a NEW feature, not part of this teardown.

```
[P-013] Read CLAUDE.md at the repo root. Goal: remove the visual plate designer entirely — axed, not deferred. AI-generated plate imagery is also ruled out; do not propose it.

STEP 1 — report before changing anything: every file, component, type, state field, and Firestore touchpoint the plate designer owns (PlateDesigner.tsx, its mount in TestKitchenHub.tsx's Menu Development Playground grid, the Ingredient Palette placeholder, anything else grep surfaces). Propose what the vacated grid space becomes for now (simple, honest empty state — no new features).

STEP 2 — after approval, remove it all and update CLAUDE.md: delete any plate-designer references and add "Visual plate designer" to the Permanently Purged list.

CONSTRAINTS:
- Pure teardown. No new functionality.
- Do not fix pre-existing TypeScript errors unless they block this work.
- One change at a time; verify with me at each step; commit after each verified working change.
```

---

## P-014 — Sous persona tuning from chef eval log — RETIRED 2026-08-21

**Retired:** superseded by P-026 per the 2026-08-21 ruling in CLAUDE.md
("Sous persona retired; extraction intake stays"). The persona this
prompt would have tuned is being removed, so there is nothing left to
tune. SOUS-EVAL.md's E-001–E-004 remain the evidence base for that
ruling; they are not discarded with this prompt.

**Origin:** Brian asked how to improve the Sous AI without coding (2026-07-20). Answer: the chef's contribution is judgment, not code — captured in SOUS-EVAL.md (repo root). Loop: Brian uses Sous in real work and logs misses (asked / got / should-have-said); Claude.ai converts the log into system-prompt corrections and few-shot examples; Code applies them; Brian re-judges against the same questions.

**Gating:** n/a — retired.

**Decisions log:**
- 2026-07-20: SOUS-EVAL.md created with entry template (E-001 numbering, fix/keep verdicts). Regional Intelligence enrichment and pantry data quality are parallel no-code levers Brian owns directly in Settings — not part of this prompt.

```
[P-014] Read CLAUDE.md at the repo root. Goal: apply the approved Sous system-prompt revision (supplied in full by Brian/Claude.ai — do not author persona content yourself). Locate where the Sous persona prompt lives, report it, replace it with the supplied version after approval, and verify live against the eval questions Brian provides.

CONSTRAINTS:
- Prompt text comes from the approved revision verbatim; no editorializing.
- Do not fix pre-existing TypeScript errors unless they block this work.
- One change at a time; verify with me at each step; commit after each verified working change.
```

---

## P-015 — Test Kitchen unification: one creative workspace — DONE 2026-07-22

**Origin:** P-011 inventory rulings (2026-07-20). Brian's design: no separation between Culinary Trends and Menu Development — trends, pricing, and seasonal data shrink into a reference rail inside the development space, so the chef sparks ideas without leaving the room. The dish takes shape live beside the conversation.

**Decisions log (2026-07-20):**
- Merge the two Test Kitchen sub-tabs into one workspace. The tab split was artificial — trends exist to provoke dishes.
- CUT: Plate Design panel/frame ("there can't be a picture until the dish is finished" — structurally wasted space; photo capture remains a separate future feature). CUT: "Trends for This Dish" panel (no spec, not in feature map). CUT: the "Chef Matthew is a placeholder" code comment — the name ships as permanent.
- BUILD: Recipe Build panel as the room's centerpiece — working name (replaces hardcoded "Untitled Dish"), yield, ingredients, method, populated from the Sous conversation via structured AI extraction; chef confirms; one action hands off to the real Recipe Builder. AI-proposes/chef-confirms, same as everywhere else.
- Reference rail sources the EXISTING trends data and listeners — no new data work.
- Open (Code proposes, Brian rules): how full trend detail survives (expand-in-place vs. full-report state); timing vs. the Aug 8 test-chef milestone.

**Status update (2026-07-22, Claude.ai review):**
- All build steps committed through defa520 (teardown, merged screen, reference rail + full-report drawer, DishDraft types, Recipe Build panel, extraction call). Trend-detail question resolved in build: full-report drawer (bbad095).
- Final step — the Send to Recipe Builder hand-off — sits UNCOMMITTED in the working tree (DishBuildPanel.tsx, TestKitchenHub.tsx, types.ts). Reviewed and approved: writes via the same recipes addDoc path as Recipes.tsx, display units convert to canonical base units at hand-off, defensive unit fallback, only kept lines transfer, chef-confirm gate holds. `npx tsc --noEmit` clean.
- BLOCKED: chef verification of the live flow — Anthropic console account at $0 (min top-up $5), so the extraction call can't run. Prod AI features down on the same key until credits land.
- Ruled (Claude.ai call, per Brian's delegation): SOUS-PROMPT-CURRENT.md is gitignored, not committed — it's a review artifact; committing it creates a second source of truth that drifts from sousPersona.ts.
- Remaining to close: credits → Brian verifies flow in browser → Code commits hand-off, adds SOUS-PROMPT-CURRENT.md to .gitignore, updates CLAUDE.md's Test Kitchen section (unified room, DishDraft types).

**CLOSED (2026-07-22):** Credits topped up; Brian verified end-to-end in browser (halibut test dish: extraction with pantry matching + not-in-pantry surfacing, yield supplied via chat + re-extract, Send → recipe doc → Builder landing with live costing — real cost/portion $14.91 vs. Sous's invented $10.80, the mandate proving itself). Code shipped all three commits: hand-off feat, .gitignore chore, CLAUDE.md docs rewrite. Working tree clean. Observations routed to parking lot: unit-fallback silent meaning change (corn 2 oz → 2 each), onMenu-by-default for extracted drafts, inline yield/portions field. Sous behavior failures during testing logged as SOUS-EVAL E-001/E-002 → feed P-014.

```
[P-015] Read CLAUDE.md at the repo root. Goal: unify the Test Kitchen into ONE creative workspace — no sub-tab separation between Culinary Trends and the Menu Development Playground. Plan-first task: report the full layout and extraction design, wait for approval before implementing.

THE ROOM (three zones):
1. Reference rail — compact/collapsed versions of the existing trend cards, pricing trends, and seasonal matrix, expandable for detail. Sources the existing trends data and listeners only; no new data work. Propose how full detail is reached (expand-in-place vs. a full-report state) — Brian rules on your proposal.
2. Sous chat — center of the room.
3. Recipe Build panel (live) — working dish name (the hardcoded "Untitled Dish" dies), yield, ingredients, method. Populated from the Sous conversation via a structured /api/ai extraction pass; nothing writes without chef confirmation; one explicit action hands the draft to the real Recipe Builder for costing and finishing.

CUTS (fold into the layout work):
- Plate Design panel/frame — remove entirely. Photo capture is a separate future feature; leave no shell for it.
- "Trends for This Dish" panel — remove entirely.
- The code comment calling "Chef Matthew" a placeholder — remove; the name is permanent.

CONSTRAINTS:
- All mutations through useKitchenState.ts; new types in src/types.ts only.
- Brand kit per CLAUDE.md; Fibonacci spacing from design-tokens.json; APP_PARAMS for brand strings.
- Do not fix pre-existing TypeScript errors unless they block this work.
- One change at a time; verify with me at each step; commit after each verified working change.
```

---

## P-016 — AI proxy hardening: caps + per-user quota + Sous history cap — DONE 2026-07-29

**Outcome:** All five steps + one follow-up fix shipped, merged to main, deployed (functions:ai + firestore:rules + hosting), live-verified on prod. Commits d14816c → e76d604 (steps 1–5), f164caa (stale plateDesigns rules-test cleanup, separate commit), ae67cd1 (follow-up: cap raised 2048 → 4096).

**Decisions log (2026-07-29):**
- Quota is **fail-open** (Brian ruling): counter read/write failure logs a warning and allows the request — per-request caps still bound every call; AI features never go down because the meter broke. Local dev (no credentials) is quota-free by construction.
- Handler stays firebase-admin-free: deployed function injects a `recordDailyUsage` transaction callback, same caller-supplies-capability pattern as `verifyIdToken`. The aiUsage counter is the proxy's sole Firestore touch.
- Day bucket is UTC (server-side, non-evadable); 429 message reworded to "try again tomorrow" since "resets at midnight" is wrong outside UTC.
- Sous request window anchors on a user turn (blind last-30 slice can start on an assistant message → Anthropic 400).
- **Follow-up regression caught by Brian in live localhost testing:** the 2048 cap rejected two existing callers — trends draft (2500) and Ingredient Advisor (3000) — visible as a red banner + console 400s. Root cause: P-016 spec set the cap without auditing callers. Fix: cap raised to 4096 (lowering callers risked truncated responses); full 11-caller audit confirms highest is 3000. Lesson: any new server-side limit ships with a client caller audit in the same prompt.
- Smoke test (prod): Sous answer ✓, trends refresh runs without banner ✓, Advisor brief with sources ✓. Anthropic credits ran dry immediately after — billing failure, not code. Auto-reload still not enabled (BRIAN-TODO).

**Origin:** 2026-07-22 viability audit (Claude.ai, VC-hat session). Verified in code: `/api/ai` gates who but not how much — client controls `system`, `messages`, and `max_tokens` with no upper bound, no rate limit, no quota. Any authenticated user is an unmetered relay on the shared Anthropic key. Also folds in the 2026-07-20 parking-lot item: Sous chat resends full unbounded history every turn.

**Decisions log (2026-07-22):**
- Brian approved Tier 1 of the audit remediation plan (this + P-017 + P-018 + PITR on BRIAN-TODO). Features untouched; Aug 8 scope unchanged.

```
[P-016] Read CLAUDE.md at the repo root. Harden the /api/ai proxy in functions/src/aiProxyHandler.ts (shared by server.ts and the deployed function — one implementation, keep it that way):

1. Reject max_tokens > 2048 with a 400. Default stays 1024.
2. Cap the messages array (reject > 40 messages or > 100KB total payload) with a 400.
3. Per-uid daily quota: a Firestore counter doc per uid per day (e.g. aiUsage/{uid}_{YYYY-MM-DD}), incremented on each verified request; reject over 200/day with a 429 and a plain message ("Daily AI limit reached — resets at midnight."). Note this requires giving the handler Firestore access — keep it to this one collection, document the exception to the "dumb proxy" note in CLAUDE.md, and add a matching security-rules block (no client read/write).
4. Client side: cap the Sous chat transcript sent per turn to the last 30 messages in TestKitchenHub.tsx (display keeps full history; only the request payload is capped).
5. Update CLAUDE.md's AI feature section with the new limits.

Constraints: one change at a time, verify with me at each step, commit after each verified working change. Do not fix anything else — report additional issues only.
```

---

## P-017 — Test suite for the math: costEngine, units, fdaRounding — DONE 2026-07-29

**Outcome:** 107 tests, 3 files, all green on main (commits 08c5e54 harness / 58ec2d7 costEngine 31 / 1eb4fd7 units 55 / 2fd8b1f fdaRounding 21), fast-forward merged and pushed. No test exposed a source bug. Standalone vitest.config.ts (node env) keeps the app build path untouched; `npm test` runs credit-free. Scope additions during build (Claude.ai rulings): wouldCreateCycle + a guard↔backstop agreement test; costPerDisplayUnit (money-facing display math). Deliberately left untested: recipeUsesEstimatedPricing, calculateTrueCost, featureFieldsFromRecipe, fcColor, smartUnit (display helpers, not money math). Found + parked: spec-exceeds-pack silent weight-rate fallback (parking lot, design-ready). nutritionEngine follow-up became P-020, issued same night.

**Origin:** 2026-07-22 viability audit. Zero automated tests; "lint" is tsc only. The pure-function core (recipe costing, unit conversion, FDA rounding/%DV) computes money and legally regulated label content — exactly what must never silently regress.

```
[P-017] Read CLAUDE.md at the repo root. Add Vitest as a dev dependency and write unit tests for the pure-function core:

1. src/lib/costEngine.ts — recipeCost (incl. sub-recipe recursion + cycle throw), costPerPortion, fcPercent, suggestedPrice, piece-true costing paths (pieceWeightG floor/pack-out), isRecipeOnMenu (incl. active-collection cases).
2. src/lib/units.ts — toBase/display round-trips for weight/volume/each, imperial and metric, invalid-unit fallbacks.
3. src/lib/fdaRounding.ts — 21 CFR 101.9(c) rounding rules and %DV against hand-computed fixtures.
4. Add "test": "vitest run" to package.json scripts. No component/DOM tests in this pass; pure functions only. No Firestore, no mocks.

Constraints: do not modify the functions under test unless a test exposes a genuine bug — if one does, stop and report before fixing. One commit for the harness, then one per module's tests, verified with me between.
```

---

## P-018 — Error telemetry: Sentry on ErrorBoundary + AI proxy — QUEUED 2026-07-22

**Origin:** 2026-07-22 viability audit. Production failures are currently invisible unless a tester reports them; a feedback cycle can't run on unseen bugs.

```
[P-018] Read CLAUDE.md at the repo root. Wire Sentry (free tier) into the app:

1. Browser SDK initialized in src/main.tsx from a VITE_SENTRY_DSN env var — a DSN is not a secret, but keep it in .env anyway; skip init cleanly when unset (local dev default).
2. Report caught render errors from src/components/ErrorBoundary.tsx (keep the existing recovery UI unchanged).
3. Report failures in the /api/ai handler's catch path (functions/src/aiProxyHandler.ts) via the Node SDK — uid tag only, never message content.
4. No performance tracing, no session replay — errors only. Update CLAUDE.md env-vars section.

Brian does the console legwork: create the Sentry project, paste the DSN into .env, and set it as a Functions secret/config. Constraints: one change at a time, verify, commit per verified step. Do not fix anything else — report additional issues only.
```

---

## P-019 — Recipe Build panel review pass: unit-swap flag, off-menu default, inline yield, add-to-pantry — DONE 2026-08-21

**Status:** DONE 2026-08-21. All 5 items (4 planned + transcript-cap ride-along) built, diff-reviewed by Claude.ai per item, merged to main (fast-forward, branch deleted), pushed to origin — 0aea2ed / 9e2ec2b / 5ab7206 / 6abcf54 / 9febc70. The separate deploy this entry was waiting on never needed to happen: the code had already been live since P-022's hosting deploy, so the remaining gate was the chef script alone.

**Live chef script — passed end to end on production (2026-08-21):**

- **Corn** flagged each-unit and **shallots** flagged weight-unit. The script expected otherwise; the script's assumption was wrong and the app was right. Recorded as-is rather than adjusting the app to match the script.
- **Butter** clean — no flag, correctly.
- **Send gated** until every flagged line was resolved.
- **"Same as portions"** filled the yield.
- **Yuzu kosho**: not-in-pantry chip → AI lookup → pantry save → the flagged line rematched against the new pantry entry.
- **Hand-off landed in the Builder** with 4 lines exactly as reviewed, `status: development`, off-menu, cost **$7.51 batch / $1.88 per portion**.

**Decisions log additions (2026-07-29, during build):**
- Item 1 hardening (Claude.ai review): hasUnresolvedLines enforced in the write-path early-return guard, not just the button disable. Bonus fix: a kept line whose ingredientId is null/vanished now blocks hand-off (previously wrote a broken refId).
- Item 3 hardening (folded in on Brian's approval): normalizeDishDraft validates the AI's yield unit against measureType (blanks invalid to ''), and a new yieldNeedsAttention gate blocks Send with the same saffron caption pattern. Net invariant: NO unit reaches Firestore that the chef didn't see as valid — lines and yield both; resolveUnit is now a dead-man net that cannot fire for any kept line or chef-visible yield.
- Item 4: AiIngredientLookup reused as-is (dark-zinc inner form inside brand-kit modal chrome — Brian's locked styling choice, accepted mixed state). onSaved widened backward-compatibly to pass { id, name }; rematched mention lands as a kept, item-1-flagged line (qty 0/unit '') the chef must complete. Known cosmetic transient to watch in the live run: a just-added ingredient's line can flash "No longer in the pantry" for a frame before the Firestore snapshot lands.

**Origin:** Parking lot 2026-07-22 (three P-015 verification observations) + Brian's 2026-07-29 live testing (steak frites: Send disabled on missing yield; every test dish blocked by missing pantry items).

**Decisions log (2026-07-29):**
- Unit-swap ruling: the silent fallback dies — the app never substitutes a unit on its own. Flagged lines are inline-editable; Send stays disabled until every flagged line is chef-resolved. Same AI-proposes/chef-confirms rule as everywhere else.
- Extracted drafts start off-menu (`onMenu: false` written explicitly at hand-off). Legacy `?? true` default untouched for existing recipes.
- Inline yield/portions on the panel (rejected alternative from the 7/22 parking-lot entry stands: loosening canHandOff means invented placeholder values). "Same as portions" one-tap fill added per Brian's redundancy observation (single-plate dishes).
- Pantry growth at moment of need: NOT IN PANTRY chips open the existing AI ingredient lookup pre-filled; chef reviews/saves (priceSource: 'regional-estimate' unless cost edited); draft line rematches. Costing integrity preserved via provenance badging — estimates allowed as clearly-labeled starting defaults per the Master Pantry Mandate.
- Chef test script supplied by Claude.ai (below) — exact inputs, expected outcomes.

```
[P-019] Read CLAUDE.md at the repo root. Goal: four review-time fixes to the Test Kitchen Recipe Build panel (components/testkitchen/DishBuildPanel.tsx). All four are chef-confirm affordances — no autonomous writes anywhere. Plan-first: report your approach per item, wait for approval, then one item at a time.

ITEM 1 — Unit-swap flag (kills a silent data corruption):
resolveUnit() currently substitutes the system default unit when the AI's unit doesn't fit the matched ingredient's measureType (e.g. "2 oz" corn against an each-measured pantry item silently became "2 each" — number kept, meaning changed). The silent fallback dies:
- At review time (not hand-off time), detect every line whose AI-proposed unit is invalid for its matched ingredient's measureType. Render those lines visually flagged (saffron — this is a genuine signal) with qty + unit inline-editable; unit select offers the valid displayUnitsFor() options for that measureType.
- Send to Recipe Builder stays disabled while any flagged line is unresolved (chef either edits it or discards it). Unflagged lines are untouched.
- resolveUnit() at hand-off remains as a last-resort safety net but should never fire for a flagged-and-resolved line — report if it still can.

ITEM 2 — Extracted drafts start off-menu:
The hand-off write sets onMenu: false explicitly on the new recipe doc. Do not touch the `?? true` legacy default in isRecipeOnMenu — existing recipes keep current behavior. The chef puts a finished dish on the menu deliberately from the Recipes library.

ITEM 3 — Inline yield / portions / dish name on the panel:
- Editable fields on the draft summary for dish name, batch yield (qty + measureType + unit) and portions — filling the gaps extraction correctly refuses to guess, without re-rolling the chat (Re-extract stays for full refreshes).
- A one-tap "Same as portions" fill: sets batchYield to { qty: portions, measureType: 'each' } for plated-dish drafts where yield-vs-portions is redundant.
- canHandOff logic unchanged — it just becomes satisfiable from the panel.

ITEM 4 — Add to pantry from NOT IN PANTRY chips:
- Each notInPantry chip becomes actionable: clicking opens the existing AI ingredient lookup flow (components/ingredients/AiIngredientLookup.tsx) pre-filled with that name — reuse the component/shared form, do not fork a second ingredient form. Report first how you'll mount it from Test Kitchen (modal like the Ingredient Advisor pattern).
- On save, the new ingredient lands via the existing paths (priceSource/provenance rules unchanged), and the draft's unmatched mention rematches to the new ingredient id — as a line the chef can keep/discard like any other. Report your rematch approach (name-normalized match against the just-created doc) before building.
- No bulk "add all" — one chip, one review, one save. Chef-confirmed each time.

CONSTRAINTS:
- All new types in src/types.ts only; no server/proxy changes in this prompt.
- Brand kit per CLAUDE.md; saffron only for the flag/signal states; Fibonacci spacing from design-tokens.json.
- Do not fix pre-existing TypeScript errors unless they block this work.
- One item at a time: propose, wait for my verification, commit per verified working item.
```

**Chef test script (run after all four items land; needs API credits):**
1. New Sous session. Say: `I want a simple corn side dish. Use 2 oz corn, 1 lb unsalted butter, and 3 shallots. Call it Corn Test Dish. It makes 4 portions.` → Extract from Chat.
2. Expect: corn line FLAGGED (saffron, editable qty/unit — pantry corn is each-measured); butter and shallot lines clean; Send to Recipe Builder DISABLED.
3. Set the corn line to `2 each` → flag clears. If yield is empty, tap "Same as portions" → Send ENABLES.
4. Expect at least one NOT IN PANTRY chip (invent an ingredient in chat if none — e.g. add "a splash of yuzu kosho"). Click the chip → AI lookup opens pre-filled → review the proposal → save → the mention becomes a real draft line matched to the new pantry item.
5. Send to Recipe Builder → recipe opens in the Builder: onMenu should read OFF (check the Recipes library badge), lines and yield exactly as reviewed.
6. Cleanup per protocol: delete Corn Test Dish and the test-created pantry ingredient (e.g. yuzu kosho) afterward.

---

## P-020 — nutritionEngine tests (P-017 extension) — DONE 2026-07-29

**Outcome:** 23 tests, all green (suite total now 130 across 4 files), commit 385de8a merged to main and pushed, branch deleted, source untouched. Two rulings baked in: (1) allergen survival across skipped lines named and locked as a safety invariant — a refactor that drops known allergens now fails tests; (2) the partial-nutrition-counts-as-complete gap asserted as documented behavior with a "PARKED DESIGN GAP" test name pointing at the parking-lot entry — Brian's ruling pending, and that test updates alongside any future fix. Remaining untested pure helpers (recipeUsesEstimatedPricing, calculateTrueCost, featureFieldsFromRecipe, fcColor, smartUnit) deliberately left — display helpers, small, credit-free if ever wanted.

**Origin:** Code's out-of-scope note at P-017 close: nutritionEngine.ts (the aggregation feeding fdaRounding) was the natural next target. Brian pulled it forward same session. Note: Brian initially issued it as "p-018" in the terminal — corrected to P-020 since P-018 (Sentry) was already assigned; the correction paste carries the right ID into the transcript.

```
[P-020] Extend the P-017 test pass to src/lib/nutritionEngine.ts — the aggregation that feeds the FDA label. Same rules as P-017: pure functions only, no Firestore, no mocks, hand-computed fixtures, do not modify the source unless a test exposes a genuine bug (stop and report first). Cover: per-100g scaling to line quantities, sub-recipe recursion (costEngine-style), per-portion division, the completeness report (missing/partial nutrition data), and allergen aggregation if it lives in this module — confirm what the module exports and propose the fixture set before writing. One module, one commit, on a working branch merged same as P-017.
```

---

## P-022 — Streamline: Test Kitchen → Recipes > Development — DONE 2026-08-21 (deployed)

Ruling: development is a state, not a place (CLAUDE.md 2026-08-09).
Queue position: after P-021, before P-012 — testers never learn a nav
layout that's about to be deleted.

STEP 1 — Relocate: move the Test Kitchen workspace (trends rail, full
report drawer + archive, pricing commentary, seasonal matrix, Sous chat,
Recipe Build panel) under Recipes as a fourth sub-tab "Development".
Remove the Test Kitchen nav tab (App.tsx viewMap + AppHeader navItems).
No feature changes — pure relocation. Verify everything works in its
new home before STEP 2.

STEP 2 — Recipe status: add status 'development' | 'active' to menu
recipes. Development recipes: up to 3 variants, notes per variant,
excluded from Menu/Collections/Guest Preview until active. Finishing =
status flip. Recipe Build panel extractions land as status:'development'
(keeps P-019's off-menu default behavior).

STEP 3 — Dashboard: one-line trends strip (in-season items +
viral-bridge, saffron signal treatment, links to Recipes > Development)
and In Development card (dish, variant #, last note, FC%). Reference
mockup: dashboard-trends-mockup.html from 2026-08-09 session.

Do not fix anything else — report additional issues only.

**Outcome (2026-08-21):** All three steps + docs pass shipped in one
session, 4 commits on main (02f8912 relocation, 162a305 status/variants,
d356358 dashboard, a568a7b docs), deployed to prod. 144/144 tests at
HEAD (14 new). Decisions logged: manual new recipes default 'active'
(development entered deliberately or by extraction); variants are
notes-only for now — costable variants parked (see PARKING-LOT.md);
status flip never resets onMenu; strip renders whenever seasonal data
exists (by design). Repo CLAUDE.md fully updated incl. stale
trend_reports claim fix. Note: repo PROMPTS.md is a different file
(AI-prompt decision log) — this queue lives in OneDrive only.

---

## P-021 — Two small UX fixes: Clients contrast + Structural key — QUEUED 2026-08-21

**Origin:** Brian's parking-lot notes 2026-07-19; carried on the APP-MAP as the pre-tester polish pair.

```
[P-021] Read CLAUDE.md at the repo root. Two small UX fixes, nothing else:

1. Events & Clients: the "Client directory — link a client to an event
above" helper text is unreadable against its background. Fix the text
color using the brand tokens (text-slate on light surfaces); check the
same treatment isn't repeated on sibling helper lines in that view.
2. Recipes > Development, pricing trends commentary: add an on-screen
key defining "Short-term" vs "Structural" (one line each, plain chef
language, e.g. Short-term = temporary market swing, expected to settle;
Structural = lasting shift, plan menus around it). Style as a muted
caption near the section header, informational not alert.

Verify: tsc --noEmit clean, npm run build clean, all vitest pass.
Do not fix anything else — report additional issues only.
```

---

*Next ID to assign: P-023.*

---

## P-023 — NODE_ENV / Vite build mode fix

**Status:** DONE (2026-08-21). All four items complete. `npm run build`
against the real `.env` now emits a true production bundle: `jsxDEV` and
`C:/dev/miseos` occurrences are both 0, `PROD` is `true`, and
`VITE_USER_NODE_ENV` is gone. Entry bundle 1,211,797 -> 1,005,321 bytes
(-201.6 KB, -17.0%) measured on the post-P-018-merge tree.

**Background:** `.env` carries `NODE_ENV=development` because `server.ts`
throws on startup when it is unset. Vite loads that file into
`process.env.NODE_ENV` and derives `isProduction` from it, so `npm run
build` builds in development mode: `import.meta.env.PROD` is `false` and
`DEV` is `true` even in the production bundle, and `dist/` ships React's
dev JSX runtime (`jsxDEV` calls carrying absolute local source paths and
line numbers). Surfaced while wiring Sentry (P-018), where gating init on
`PROD` removed the init call from the production bundle entirely — worked
around there by gating on `MODE === 'production'` instead. This prompt
fixes the root cause.

**Scope:**

1. Remove `NODE_ENV` from `.env` and `.env.example`. Make `server.ts`
   default it to `development` when unset (`process.env.NODE_ENV ??=
   'development'` or equivalent) so local behavior is unchanged and the
   existing startup validation still rejects a bad explicit value.
2. Confirm `npm run build` now emits a true production bundle: grep
   `dist/` for `jsxDEV` (expect 0) and for `C:/dev/miseos` (expect 0).
   Report the bundle size delta.
3. Update CLAUDE.md's Error reporting section and the `.env.example`
   Sentry comment to state that the browser SDK initializes only when
   `MODE` is `production` AND `VITE_SENTRY_DSN` is set. Both currently
   describe only the DSN condition.
4. Typecheck, build, 144 tests, then commit.

**Constraint:** Do not fix anything else — report additional issues only.

**Note for whoever runs this:** P-018 gated Sentry on `MODE`, not `PROD`,
specifically to survive this bug. Once `PROD` is correct again, `MODE`
still works and needs no change — revisit only if the two ever diverge for
another reason.

**Findings while executing (2026-08-21):**

- **`.env.example` never carried `NODE_ENV`.** Only the real `.env` did.
  That half of scope item 1 was a no-op, not an oversight — the example
  file lists Firebase and Sentry values and nothing else.
- **`npm run dev` and `npm start` were never relying on `.env` for it.**
  Both already set it explicitly via `cross-env` (`NODE_ENV=development`
  and `NODE_ENV=production` respectively). The `.env` line was therefore
  doing nothing for the server and only affecting `npm run build`, which
  runs bare `vite build` with no prefix. That is why removing it is safe:
  the two scripts that matter set it themselves, and `server.ts`'s new
  default covers a bare `tsx server.ts`.
- **Measured effect of the fix — authoritative figures:** entry bundle
  **1,211,797 -> 1,005,321 bytes (-201.6 KB, -17.0%)**, measured on the
  post-P-018-merge tree, which is the tree that shipped. `jsxDEV` and
  `C:/dev/miseos` occurrences both drop from 2273 / 2271 to 0. These
  match the Status line above.
  - *Superseded:* an earlier measurement taken **before** the P-018
    merge, simulated with a shell `NODE_ENV=production`, read 1,121,653
    -> 916,145 bytes (-200.7 KB, -18.3%) for the entry bundle and
    1,737,157 -> 1,299,405 bytes (-427.5 KB, -25.2%) for all `dist/` JS.
    Both sides of that comparison predate the Sentry SDK, so the
    percentage is not comparable to the shipped figure — the absolute
    saving is nearly identical (-200.7 vs -201.6 KB); the percentage
    differs only because P-018 enlarged the denominator. Kept for the
    record, not for citation.

---

## P-024 — firebase.json predeploy hook for functions

**Status:** QUEUED — not yet executed.

**Background:** `firebase deploy --only functions` uploads `functions/`
and runs the compiled `lib/` named by `functions/package.json`'s `main`.
It does **not** run `tsc` — `firebase.json`'s `functions` block has no
`predeploy` hook — so whoever deploys must remember to run `npm run
build` in `functions/` first. A forgotten build ships a stale `lib/`
silently: the deploy reports success and the old code keeps running.
Surfaced during the P-018 deploys, where the functions build had to be
run by hand before each attempt.

**Scope:**

1. Add `"predeploy": ["npm --prefix functions run build"]` to the
   `functions` block in `firebase.json`.
2. Verify by making a trivial source-only change in `functions/src`,
   deleting `functions/lib`, and running a deploy — the hook must
   rebuild `lib/` before packaging, and the deployed function must
   reflect the change.
3. Confirm the hook does not break `firebase deploy --only hosting`
   (predeploy is per-target, so hosting should not invoke it).

**Constraint:** Do not fix anything else — report additional issues only.

---

## P-025 — reportError delivery guarantee + dev-only forced-error trigger

**Status:** QUEUED — not yet executed.

**Background:** P-018's `reportError` is fire-and-forget. The callback is
typed synchronous (`(err, uid) => void`), so `aiProxyHandler.ts` calls it
without awaiting and returns the 502 immediately. A Cloud Run instance can
be frozen between the response being sent and the capture completing, so a
report can be lost — and after P-018's dynamic-import change the reporter
now also has an `await import('@sentry/node')` to clear first, which
widens that window. Server-side reporting is currently configured but has
never been observed working end-to-end: the DSN is correct and the
function is deployed, but no real proxy failure has occurred, so no event
has ever left the server.

**Scope:**

1. Make the `reportError` callback async: `(err, uid) => Promise<void>` in
   `AiProxyRequest`'s handler signature (`functions/src/aiProxyHandler.ts`).
2. `await` it in the handler's catch path **before** returning the 502, so
   the response is not sent until the report is handed off. Keep it
   non-fatal — a reporting failure must never change the status or body
   the caller sees.
3. In the Cloud Function's reporter (`functions/src/index.ts`), call
   `Sentry.flush(2000)` after `captureException` so the event is actually
   transmitted before the instance can be frozen. Keep the dynamic import
   and the cached module promise from P-018.
4. **Keep the payload uid-only.** The system prompt, the messages, and
   every other part of the request body stay out of the report. This is
   the hard rule from P-018 and nothing here relaxes it.
5. Write a test for `reportError`. Note this is authoring, not editing:
   there is **no committed test for it today**. The 144-test suite covers
   pure logic (`costEngine`, `nutritionEngine` and the like), and P-018's
   verification of the catch path was a throwaway script that was never
   committed. Budget for a new test, not a signature update to an
   existing one.
6. **Dev-only forced-error trigger**, so delivery can be proven without
   waiting for a real outage: if the request body contains
   `{"__forceError": true}` AND the caller's uid appears in
   `ALLOWED_TEST_UIDS` (comma-separated; shipped via `defineSecret` per
   Ruling 2), throw before the Anthropic call so the catch path runs for
   real. `ALLOWED_TEST_UIDS` carries only a placeholder in production
   until Brian sets a real uid, and the trigger **must be a complete
   no-op when it holds no real uid** — an unset, empty, or placeholder
   value means no uid can trigger it, and `__forceError` in the body is
   ignored entirely. Verify that case explicitly; it is the property
   that matters most here. Allowlist entries are honored only if they
   match a Firebase uid shape (`/^[A-Za-z0-9]{20,36}$/`); anything else,
   including the `none` placeholder, is ignored. The forced-error test
   must include a case proving a non-uid entry never enables the
   trigger.
7. **Create the `ALLOWED_TEST_UIDS` secret BEFORE deploying** —
   `defineSecret` fails the deploy when the secret has no version (see the
   P-018 log, where exactly this blocked `firebase deploy --only
   functions`). Seed it with a single placeholder value like `none` via
   `--data-file -`, then set it to a real uid only for the duration of a
   test.
8. Document in CLAUDE.md — the Error reporting section for the delivery
   guarantee, and the AI feature section for the trigger and its config
   value.

**Constraint:** Do not fix anything else — report additional issues only.

**Rulings (Brian, 2026-08-21) — these are decided, not open. Implement as
stated rather than re-litigating them.**

- **The forced throw sits AFTER the quota check.** The point of the
  trigger is to exercise the real failure path, so it runs in the same
  position a genuine Anthropic failure would — after auth, after the 400
  validations, and after the per-uid daily counter has been incremented.
  A forced test error therefore consumes one request of that uid's daily
  200; that cost is accepted deliberately. Note the consequence: repeated
  delivery testing draws down the same bucket real usage does, so test
  against an account whose quota headroom does not matter.
- **`ALLOWED_TEST_UIDS` ships via `defineSecret`** — not because it is
  secret (it is not; it is a list of uids), but because consistency with
  the no-second-`.env` decision wins. `defineString` would write a
  `functions/.env.<project>` file, and keeping that file out of the repo
  is an existing, deliberate choice that the Sentry DSN already follows.
  One configuration path for this function, not two. Add it to the `ai`
  function's `secrets` array alongside `ANTHROPIC_API_KEY` and
  `SENTRY_DSN`, and set it with `--data-file -` rather than the
  interactive prompt (see the P-018 log for why that prompt is a trap).
- **`Sentry.flush(2000)` stands.** The 2s bound on the 502 path is
  accepted as written. Revisit only with measured evidence that it is
  actually costing something — not on the basis that two seconds sounds
  long.

**Security note:** the trigger is a deliberate on-demand failure path in a
deployed function. It is gated behind auth plus an explicit uid allowlist,
and the worst a listed uid can do is force 502s against their own account,
but it is still a backdoor by construction — keep `ALLOWED_TEST_UIDS`
unset except during an actual test, and never widen it to a whole
environment.

---

## P-026 — Replace Sous chat with extraction intake

**Status:** QUEUED — not yet executed.

**Background:** Implements the 2026-08-21 ruling in CLAUDE.md ("Sous
persona retired; extraction intake stays"). The chat character goes; the
free-text-to-structured-draft path stays. The test the ruling sets: does
this surface do something the Builder form cannot? Intake yes; character
no.

**Scope:**

1. On Recipes > Development, replace the Sous chat panel with a single
   "Describe the dish" textarea + Extract button. Submit goes directly to
   the existing extraction path (same prompt, same `normalizeDishDraft`,
   same Recipe Build panel). No greeting, no persona system prompt.
2. Below the draft, a refinement input: free text applied to the current
   draft ("make it 6 portions"). Each refinement is one proxy call that
   returns a revised draft; the chef reviews line changes in the panel as
   today. Cap refinement history at 10 turns (P-016's 30-message window is
   the hard ceiling; 10 is the UX limit).
3. Remove the Sous persona system prompt, the Sous name/avatar, and any
   "ask Sous" copy across the app. **Grep for Sous/sous and report every
   hit before deleting.** The Ingredient Advisor and Trends are untouched.
   `SOUS-PROMPT-CURRENT.md` is gitignored local scratch, not part of the
   app — **excluded from the sweep**. It also will not appear in a fresh
   clone, so grep results differ by machine; do not treat its absence as
   a clean sweep or its presence as a missed one.
   Also rename the Development view header: `TestKitchenHub.tsx` still
   reads "Test Kitchen" with the sub "Develop new dishes with real-time
   AI assistance" — a P-022 leftover. Make it "Development" with a
   one-line sub.
4. Extraction prompt: strip any persona framing; keep the structured-output
   contract exactly. **Report the diff of the prompt before committing.**
5. Mark P-014 RETIRED in PROMPTS.md with reason "superseded by P-026 per
   2026-08-21 ruling". Retire the Chef Matthew parking-lot entry the same
   way. **Already done — P-014 half landed 2026-08-21; Chef Matthew
   parking-lot entry retired 2026-08-21 (PARKING-LOT.md, OneDrive).**
   Verify both rather than redoing them.
6. Typecheck, build, 144 tests, and add tests: one that the extraction
   prompt contains no persona text, plus one per invariant in item 7
   (three). Correct CLAUDE.md's hand-off gate, which currently documents
   only `canHandOff` — the real gate is
   `canHandOff && !hasUnresolvedLines && !yieldNeedsAttention`
   (`DishBuildPanel.tsx`). The docs describe a weaker gate than the code
   enforces. Commit per step.
7. **Intake invariants carried from SOUS-EVAL (rules survive the
   persona).** Retiring the character does not retire the behavioral
   rules the chef's eval log established — three of them describe the
   intake, not the persona, and each gets a test in item 6:
   - **(a) No prices.** Extraction output never contains a price or cost
     figure. Costing happens only in the Builder, from pantry data.
     (E-002 — Sous invented a per-plate breakdown and a 24% FC at $45,
     formatted like real analysis, from no data at all.)
     - *Enforcement (decided, not open):* `normalizeDishDraft` strips
       currency figures from **all** text fields — line notes, method
       steps, variant notes. Client-side, so a model that emits a price
       anyway cannot land one. The prompt instruction is retained as a
       secondary measure, not the guarantee. **Test:** feed `"$12 per
       plate"` inside a method step and assert the normalized output is
       clean.
   - **(b) Always a draft, never prose.** Every submission returns a
     structured draft. If the description is too thin to extract, the
     draft comes back with empty fields flagged — not a conversational
     reply asking for more. (E-003 — a recipe request answered with
     technique narrative instead of the recipe.)
     - *Guarantee (decided, not open):* it lives at the **client**, not
       in the prompt. A parser rejection renders an empty, fully-flagged
       draft captioned "Couldn't read that — try describing the dish
       again" — **never an error toast**. Prose that fails to parse is
       therefore indistinguishable, to the chef, from a description too
       thin to extract: both produce a draft to work from. **Test:**
       assert that state on parse failure.
   - **(c) No refusal by scope.** The intake never refuses a dish
     description on grounds of scope or cuisine. (E-004 — "not my lane,"
     which the log records as a firing-offense attitude in this brand's
     kitchens.)

**Constraints:**

- The P-019 hand-off invariants are untouched and must still pass the
  P-019 live script after this change: no unit reaches Firestore the chef
  did not confirm, drafts start off-menu, and the `hasUnresolvedLines`
  gate holds.
- Do not fix anything else — report additional issues only.

**Reference inventory (Sous/sous hits as of 2026-08-21, for scope item 3 —
re-grep at execution time, do not trust this list):**

| Hits | File |
|---|---|
| 27 | `CLAUDE.md` |
| 26 | `SOUS-PROMPT-CURRENT.md` (gitignored local scratch) |
| 14 | `PROMPTS.md` |
| 9 | `src/lib/sousPersona.ts` |
| 6 | `src/TestKitchenHub.tsx` |
| 6 | `src/lib/sousAppKnowledge.ts` |
| 5 | `src/components/testkitchen/DishBuildPanel.tsx` |
| 4 | `AUDIT-2026-07-17.md` |
| 1 each | `src/types.ts`, `src/Staff.tsx`, `src/RecipesHub.tsx`, `src/lib/dishDraftToRecipe.ts`, `docs-brand-v1.1-migration-scope.md` |

Note that the doc hits outnumber the code hits. `PROMPTS.md`'s dated
2026-07-18 entry carries the full persona canon and is a historical record
— per this file's own convention, pre-convention entries are left as
written, so retiring the persona does not mean rewriting that entry.
Decide explicitly what happens to it rather than deleting it in a sweep.

**Ruling (Brian, 2026-08-21) — item 2, refinement contract. Decided, not
open. Supersedes the earlier merge-by-reconciliation version of this
ruling.**

**One output contract, and chef-kept lines are immutable to the model.**
A refinement call returns a full revised draft, same shape as the initial
extraction — no second patch contract. Applying it to the draft on screen:

- **The model may add new lines**, which arrive flagged, in the same
  needs-attention state a fresh extraction would produce.
- **The model may modify lines the chef has not yet resolved.**
- **The model never modifies or removes a kept line.** A line the chef has
  resolved is immutable to the refinement, full stop.
- **Omission from the revision is ignored.** A kept line missing from the
  response stays; absence is not a removal signal.

**Removal of, or changes to, a kept line happen only through the panel's
existing discard and inline-edit controls** — the chef's own affordances,
not the model's output. This is the same principle as the Master Pantry
Mandate: the model proposes, the chef disposes, and nothing the chef has
already confirmed moves without the chef moving it.

**No prose-matching of refinement text against ingredient names.** There
is no "unless the refinement names that ingredient" escape hatch — that
would require matching free text against pantry names, a second and
fuzzier match, and it is explicitly not part of this design.

**Normalized-name matching reuses the `InvoicePriceUpdate.tsx`
convention** (lowercase, strip punctuation, collapse whitespace) —
decided, not open. One normalization rule in the codebase, not two.
