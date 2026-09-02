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

→ Persona retired 2026-08-21 per CLAUDE.md's ruling; see P-026.

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

## P-018 — Error telemetry: Sentry on ErrorBoundary + AI proxy — DONE 2026-08-21

**Status:** DONE 2026-08-21. All four steps built one at a time and committed per verified step, merged to main as `7115b44` (branch `p-018-sentry` deleted): `68654df` browser SDK init in `src/main.tsx`, `0b8669d` `ErrorBoundary.componentDidCatch` → `captureException` (recovery UI untouched), `b3c3c00` `/api/ai` catch-path reporting via an injected `reportError(err, uid)` callback (uid tag only — never the system prompt, the messages, or any part of the request body), `1621fd4` CLAUDE.md env-vars + Error reporting sections. No tracing and no replay on either side: neither SDK sets `tracesSampleRate` and `replayIntegration` is never added.

**Two follow-ups landed the same day, both out of live deploys:**
- `b0604ad` — init gated on `import.meta.env.MODE === 'production'` **and** the DSN, not the DSN alone. Vite inlines `VITE_*` into the dev bundle too, so a DSN in `.env` made every local crash burn free-tier quota. `MODE` not `PROD` — see the P-023 note on why `PROD` reads false in this repo even under `npm run build`.
- `86122f1` — `@sentry/node` imported dynamically inside `reportError` rather than at module scope. The eager import cost ~1.4s of OpenTelemetry setup and pushed `functions/src/index.ts` past the 10s budget `firebase deploy --only functions` allows for loading the code to discover its exports; the deploy failed outright with "Cannot determine backend specification".

**Hardened by P-025** (`360ce1b`): the server-side report is now awaited before the 502 returns, and the Cloud Function reporter awaits `Sentry.flush(2000)` — capture alone only queues the event, and a Cloud Run instance can be frozen the moment the response goes out.

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

**Chef test script (run after all four items land; needs API credits).
Rewritten 2026-08-29 — the original described the Sous chat UI (step 1's
"New Sous session / Extract from Chat," step 4's "invent an ingredient
in chat"), which P-026 deleted; every assertion below is the same one
the original made, run against the current dish-description intake
(P-026) with its refinement input and Start Over (P-026) and the
navy/cream button-contrast fix (P-030) folded in:**
1. Recipes > Development. In the "Describe the dish" box: `I want a simple corn side dish. Use 2 oz corn, 1 lb unsalted butter, and 3 shallots. Call it Corn Test Dish. It makes 4 portions. Add a splash of yuzu kosho.` → Extract.
2. Expect: corn line FLAGGED (saffron, editable qty/unit — pantry corn is each-measured, so 2 oz cannot resolve); butter and shallot lines clean; Send to Recipe Builder DISABLED.
3. Confirm the disabled "Same as portions" label is READABLE before tapping (P-029 raised it from 1.71:1). Set the corn line to `2 each` → flag clears. If yield is empty, tap "Same as portions" → Send ENABLES.
4. Expect a NOT IN PANTRY chip for yuzu kosho. Click it → AI lookup opens pre-filled → review the proposal → save → the mention becomes a real draft line matched to the new pantry item.
5. Send to Recipe Builder → recipe opens in the Builder: onMenu should read OFF (check the Recipes library badge), lines and yield exactly as reviewed.
6. NEW (P-026): in the refinement box, `make it 6 portions`. Expect portions to update and every already-resolved line to stay exactly as left — a kept line reverting to flagged is a FAILURE of the immutable-kept-lines ruling, not a quirk.
7. NEW (P-026): Start Over clears the draft cleanly.
8. Run steps 1–5 once in each Surface (DAY and SERVICE, Settings' Surface toggle). Confirm the Extract and Send buttons are readable in Service — that is the 1.00:1 collision P-030 fixed.
9. Cleanup per protocol: delete Corn Test Dish and the test-created pantry ingredient (yuzu kosho) afterward.

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

## P-021 — Two small UX fixes: Clients contrast + Structural key — DONE 2026-08-28 (commit eaf0b8b), deployed 2026-08-31

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

**Outcome (commit eaf0b8b, 2026-08-28):** Item 1's helper text fixed —
4.36:1 → `text-slate`, same treatment checked against sibling helper
lines in the view (none repeated). Item 2's Structural/Short-term key
added to both the trends rail and the full-report drawer. Amendment
found mid-prompt, not in the original scope: both Events & Clients
section h1s were `text-white` on the cream page shell, measuring 1.11:1
— invisible, not merely low-contrast. Fixing only the originally-scoped
helper text would have shipped a contrast fix that still left the
headings unreadable, so both were pulled in. This is what led to the
app-wide ghost-white-heading inventory that became P-030 item 2.

Verified: `tsc --noEmit` clean, `npm run build` clean, all vitest pass.
Pushed to origin/main and deployed (hosting) 2026-08-31, alongside
P-026/P-029/P-030/P-031.

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

**Status:** DONE 2026-08-21. All three items verified against production.

**Verification:**

- **Item 2 — the hook rebuilds a deleted `lib/`.** `functions/lib` was
  removed entirely, then `firebase deploy --only functions` run. The
  deploy printed `Running command: npm --prefix functions run build` →
  `tsc` → `Finished running predeploy script`, rebuilt `lib/` from
  source, and packaged and updated `ai(us-central1)` from it. Without the
  hook that deploy could not have succeeded at all — there would have
  been no compiled entry point to discover. The source change carried
  through: a header note added to `functions/src/index.ts` appears in the
  rebuilt `lib/index.js`, and the package grew 52.98 KB → 53.2 KB.
- **Item 3 — hosting does not invoke it.** `functions/lib` was deleted
  again and `firebase deploy --only hosting` run; `lib/` stayed absent
  and the hosting deploy completed normally. `predeploy` is per-target,
  confirmed empirically rather than assumed.

**Finding — the discovery timeout is marginal, not fixed.** The first
deploy of this run failed at the analysis stage with "Cannot determine
backend specification. Timeout after 10000" — the same P-018 failure,
after the predeploy hook had already succeeded. An immediate retry, with
no code change, deployed cleanly. The compiled module loads in ~1.3s
locally, far inside the 10s budget, so this is the analysis subprocess
being starved (it runs straight after `tsc`), not a real module-load
cost. P-018's dynamic `@sentry/node` import reduced the pressure but did
not eliminate it: expect an occasional first-attempt failure that a
retry clears, and treat a repeat failure as a signal that something new
was added at module scope.

**Standing mitigation (from P-025's deploy):** prefix functions deploys
with `FUNCTIONS_DISCOVERY_TIMEOUT=30000`. The predeploy hook now
guarantees a `tsc` run immediately before every discovery, so the
analysis subprocess is always competing with a just-finished compile —
raising the budget from 10s to 30s removes the race rather than retrying
past it. Use it as the default:

```
FUNCTIONS_DISCOVERY_TIMEOUT=30000 firebase deploy --only functions
```

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

**Status:** DONE 2026-08-21. All eight items complete, deployed to
production. Suite 144 -> 160 tests (16 new, all authored — `reportError`
had no committed test before this). Three secrets bound to `ai`:
`ANTHROPIC_API_KEY`, `SENTRY_DSN`, `ALLOWED_TEST_UIDS`. Liveness
confirmed: unauthenticated `POST /api/ai` returns 401, with and without
`__forceError` in the body.

**`ALLOWED_TEST_UIDS` ships holding `none`** and was deliberately not set
to a real uid — the trigger is inert in production. Arming it is a
separate, explicit act.

**Deployed with `FUNCTIONS_DISCOVERY_TIMEOUT=30000`** — see P-024's
standing mitigation. The deploy succeeded first try, against two
first-attempt failures during P-018/P-024 without it.

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

## P-026 — Replace Sous chat with extraction intake — DONE 2026-08-28, deployed 2026-08-31

**Status:** DONE 2026-08-28. Executed as amended in a follow-up message
(the amendments corrected the stale test count, applied P-028's
colour-vision-deficiency rules to every new element, and added Ruling 3
below — item 4 turned out to be a full input-contract rewrite, not a
persona strip). Six commits, one per step, each independently verified
(`tsc --noEmit`, `npm run build`, `npm test`, `npm run check:color`):

- `3168a81` — items 1+2+4: `src/lib/dishExtraction.ts` (new pure module:
  prompt, `normalizeDishDraft`, `normalizeIngredientName`,
  `reconcileRefinement`, `stripPriceMentions`, `EMPTY_DISH_DRAFT`) +
  `DishBuildPanel.tsx` rewritten to own the whole intake (textarea →
  Extract → draft → refine → Send) + `TestKitchenHub.tsx`'s chat state
  and 4-column layout removed entirely (now rail(1)/build(3)) +
  `dishExtraction.test.ts`, 15 tests.
- `2ff9669` — item 3: `sousPersona.ts`/`sousAppKnowledge.ts` deleted
  (grep-confirmed zero remaining importers first), three doc-comment
  fixes (`types.ts`, `dishDraftToRecipe.ts`, `RecipesHub.tsx`).
- `0def200` — Ruling 1: the 2026-07-18 persona-canon entry gets one
  appended line, body untouched — same treatment as P-014 and the
  Chef Matthew parking-lot entry.
- `060a195` — Ruling 2: CLAUDE.md's 18 obsolete hits rewritten in its
  own commit; the 2 inside the Ruling 2026-08-21 section kept exactly
  as written, per the amendment.

**Item 5, verified not redone:** P-014 already `RETIRED 2026-08-21`
with the exact required reason string; the Chef Matthew parking-lot
entry already carries its `→ RETIRED 2026-08-21` outcome. Both
confirmed before any other work started.

**Item 6's CLAUDE.md hand-off-gate correction — verified already
correct, no change needed.** The entry claimed CLAUDE.md documented
only `canHandOff`; by execution time the Hand-off bullet already read
`canHandOff && !hasUnresolvedLines && !yieldNeedsAttention` in full —
presumably fixed in an earlier pass this entry predates. Re-verified
after every subsequent CLAUDE.md edit in this pass; still correct.

**Final suite: 184/184** (169 baseline + 15 new — the amendment's
corrected count, confirmed at execution time, not the entry's stale
144).

**Reference inventory correction:** the entry's own table (below) read
94 hits / 9 files as of 2026-08-21. The actual grep at execution time
(2026-08-28, after fixing an initial `-w` undercount that missed
identifier substrings like `SOUS_SYSTEM_PROMPT`) found 111 hits across
13 files. The entry's own instruction — "re-grep at execution time, do
not trust this list" — held; recorded here so the gap doesn't look like
a missed step.

**Judgment calls made during execution (entry silent on all three):**
- A refinement's own parse failure does not reset an already-confirmed
  draft to `EMPTY_DISH_DRAFT` — it leaves the draft untouched and
  reports inline. Invariant (b)'s exact language ("empty, fully-flagged
  draft") fits the first extraction, where there's nothing to preserve;
  discarding confirmed chef work on a refinement failure would be a
  worse outcome than the invariant is guarding against.
- `DishBuildPanel.tsx`'s own `handleIngredientAdded` normalization
  (previously a locally-inlined, slightly different regex than
  `InvoicePriceUpdate.tsx`'s) was switched to the same shared
  `normalizeIngredientName` the new refinement-reconciliation match
  needed anyway — one normalization rule in this file now, matching
  the ruling's stated principle, without touching
  `InvoicePriceUpdate.tsx` itself (out of scope).
- A "Start Over" action was added (clears the draft back to the
  textarea) as the direct functional replacement for the old chat's
  "New Session" — without it there was no way to abandon a draft and
  describe a different dish short of a full page reload, which reads
  as a usability regression the entry didn't intend, not a scope
  expansion.

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
     - *Scope of the strip (decided, not open):* it applies **only to
       model output**, at extraction and refinement time. Chef-typed and
       chef-edited text is never altered — Master Pantry Mandate: the
       model proposes, the chef disposes, and nothing the chef wrote is
       silently rewritten. A price the chef types into a note stays.
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
     - *Enforcement (decided, not open):* satisfied **structurally** —
       there is no conversational surface left to refuse from — and the
       extraction prompt contains no scope, cuisine, or refusal
       language. **Test:** assert the prompt carries none of it, and
       that an out-of-cuisine fixture ("Tteokbokki, 6 portions,
       gochujang, rice cakes, fish cake") yields a draft with lines, not
       an empty or refused result.

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

**Ruling (Brian, 2026-08-28) — item 4, the extraction prompt is a new
input contract, not a persona strip. Decided, not open.**

The entry as originally written framed item 4 as stripping persona
framing while keeping "the same prompt." That undersold it: the old
prompt opened "extracting a working recipe draft from a chef's
brainstorming conversation with a sous chef... You will receive the full
chat transcript," and the call site sent `{transcript:
[{role:'sous'|'chef', content}], pantry}` windowed to the last 30
messages anchored to a chef turn. With the chat gone there is no
transcript, no roles, and nothing to anchor — the body rules inherited
the same assumption throughout ("the dish under discussion," "if the
conversation gives no real basis," "only pull from what was actually
discussed"). Those are input instructions, not persona framing, and they
had to change regardless of the persona.

**Two input shapes, one prompt:**
```
extraction:  { description, pantry }
refinement:  { description, currentDraft, refinement, pantry }
```
Carried over verbatim: the output JSON shape, the unit list, and every
anti-invention rule (`ingredientId` copied exactly from the pantry list,
never invent an id, null `batchYield` rather than a guess, `notInPantry`
informational only, leave fields empty rather than guessing). Only the
sentences describing the input changed. The last-30 transcript window in
`handleExtract` was dead code once there's no transcript — removed;
item 2's 10-turn refinement cap replaces it as the only per-draft limit
left.

One rule added, not carried over from anywhere: never state a price,
cost, or FC% (E-002's invented $45 analysis). Prompt-level instruction
only — the actual guarantee is `stripPriceMentions`, client-side, applied
to model output only.

---

## P-028 — Colour-vision-deficiency palette + non-colour encoding pass

**Status:** DONE 2026-08-26. Deployed to production (hosting only, no
functions/rules changes). Commits `4e0ba29`..`775f76b` on `main`, pushed.

**ID collision, noted for the record.** The chat that opened this work
labeled its prompt "P-027" — but P-027 was already assigned (Recipes view
declutter: category dropdowns + segmented sub-tabs, commit `9f4a697`,
DONE 2026-08-25). Every commit in this body of work is therefore titled
`P-028` instead, to keep IDs permanent and searchable rather than
reusing one. This entry is the first place P-028 is recorded in this file;
P-027's own entry was never backfilled here and should be if this file is
meant to be the authoritative mirror going forward.

**Origin:** Brian is colourblind (type undetermined). A 2026-08-22 audit
(WCAG relative luminance + Machado/Oliveira/Fernandes 2009 simulation)
found two straight WCAG 1.4.3 failures and one isoluminance failure in the
Brand v1.1 palette.

**Shipped, in order:**

1. Shared `src/lib/formStyles.ts` — `INPUT`, `FIELD_LABEL`, `BTN_ACTION`
   (renamed from `BTN_PRIMARY`), `BTN_DESTRUCTIVE` (new), `BTN_GHOST`,
   `BADGE`. Consolidates five constants that had been hand-copied
   byte-identical into 7-8 files.
2. **Item 1** — `--color-teal` `#1E7A74` -> `#0B564F`. Was 4.40:1 on
   cream (a straight AA fail); now 7.32:1.
3. **Item 2** — `--color-saffron-text` renamed `--color-wordmark-saffron`,
   restricted to exactly the two Study-A lockup sites (`AppHeader.tsx`,
   `SignIn.tsx`). Every other saffron-as-text/icon/border site in `src/`
   converted to navy content on a saffron fill, per the standing rule now
   in CLAUDE.md: **saffron is a fill, never a boundary and never a text
   colour.** `--color-saffron-soft` deepened `#FBF0DC` -> `#F2D8A2` (the
   old value was 1.03:1 against cream — imperceptible).
4. **Item 3** — `--color-danger` unchanged; already passed.
5. **Item 4** — every inline `<a>` (4 total, confirmed exhaustive) carries
   a permanent underline, not hover-only.
6. **Item 5** — `BTN_DESTRUCTIVE` distinguishes from `BTN_ACTION` by
   *form* (outline vs. filled), not hue. Wired through the one shared
   `AlertDialog` every delete-confirmation in the app renders through,
   plus one more filled-danger site found outside it
   (`RecipeCollections.tsx`'s inline confirm-delete).
7. **Item 6** — `fcColor` (emerald/amber/red hue-only) replaced by
   `fcIndicator()`: navy through under/borderline, danger only for
   over-target, escalation carried by weight + a leading glyph
   (`●`/`▲`), never colour alone. New shared `src/components/FcValue.tsx`.
   9 new tests (169 total). Two more hand-copied hue-only duplicates
   found and consolidated (`Features.tsx`, `DailyCribSheet.tsx`).
8. **Item 7 (amended)** — `scripts/check-color.mjs`, hand-run via
   `npm run check:color` (`culori` devDependency). Not wired into CI —
   that's P-029, below. Checks WCAG contrast, the wordmark exception,
   saffron-as-boundary/text placement, and OKLab CVD-simulated
   distinguishability for five ink pairs. Verified it actually catches a
   regression (reverted teal, confirmed the contrast check fails at
   exactly 4.40, restored, confirmed clean).
9. **Follow-up** — sites 1 (Dashboard trends strip) and 4 (archived-report
   notice) restructured from a full-bleed `bg-saffron-soft` fill to a
   white panel with a 3px navy left rule + 12px saffron-soft inset band.
   Screenshot comparison (real Chrome DevTools Protocol
   `Emulation.setEmulatedVisionDeficiency`, not a CSS-filter
   approximation) showed the deepened wash read as an active highlight —
   not a warning, but heavier than intended — specifically on large
   full-bleed panels; small badges/chips at the same token were fine.
   Geometry was the variable, not the colour. Token unchanged.

**CVD threshold recalibrated 2026-08-26 (P-029 pre-work), resolving the
apparent 20/30-failing state above.** The original `check:color` threshold
(0.15 OKLab dE) was set by analogy from CAM02-UCS numbers — a different
metric, different scale — and rejected pairs like navy/teal that measure
dE~30 in CAM02 across all observers and read as visibly distinct.
Recalibrated against two real anchors, both under deuteranopia @ severity
1.0: slate vs. the OLD teal (`#1E7A74`) = 0.0298, the actual known-real
failure (1.06:1 WCAG contrast) that started this whole pass — threshold
must sit above it; navy vs. the CURRENT teal (`#0B564F`) = 0.1000, known-
good — threshold must sit below it. Midpoint 0.0649, rounded to **0.06**.
Full 30-row table in commit `edc4fda`'s message.

At 0.06: **29 of 30 pass.** The one holdout — `teal/danger` under
protanopia @ severity 1.0, measured 0.0538 — is real (below even the LOW
anchor, not calibration noise) but is explicitly accepted in code
(`CVD_ACCEPTED_EXCEPTIONS` in `scripts/check-color.mjs`, commit `775f76b`):
no surface relies on that pair by colour alone today (links underlined,
destructive buttons outlined+icon+label, FC% glyph+weight — items 4/5/6
above). `npm run check:color` now exits 0. Any future exit 1 is a genuine,
un-accepted finding, not a threshold argument.

**Also reported, not fixed:** Recipes.tsx's FC% progress bar fill still
hue-encodes emerald/amber/red (directly below the now-fixed text
indicator); `ErrorBoundary.tsx`'s filled-red recovery button (a lone
action, not a primary/destructive pairing); `DailyCribSheet.tsx` and
`Features.tsx` classify FC% against a hardcoded 28%/34%, not the real
configurable `targetFcPercent` every other FC% display reads — a
pre-existing correctness bug, unrelated to colour, surfaced while
consolidating their duplicate `fcColor`.

**Unexplained origin branches — logged, not investigated.** `git fetch`
during this work's push surfaced five branches on `origin` that nothing in
this session created, with machine-generated-looking names:
`feature/menu-strategy-integration-tests-11814730879415576376`,
`fix/update-retired-gemini-model-14434693624815205626`,
`housekeeping-alignment-12295418740495349143`,
`main-12048487173765127597`,
`scaffold-inventory-financial-modules-14737302586424772395`. Something
other than this session is pushing to this repo. **Not touched, not
deleted, not merged** — recorded here so the finding isn't lost before
someone determines what created them.

**A second local clone exists, possibly related.** Session-end bookkeeping
(2026-08-26) needed the OneDrive `miseos` folder this file's own
"Where things live" convention describes, and found it at
`C:\Users\brian\OneDrive\Desktop\miseos\` — but that folder is not just the
four cited files. It has its own `.git`, `CLAUDE.md`, `PROMPTS.md`,
`SOUS-EVAL.md`, `src/`, `functions/`: a second, separate local clone of
this repo, distinct from wherever this session's clone lives. Its
`PROMPTS.md` was last modified 2026-08-24 — stale, missing this entire
P-028 pass. Unverified but worth checking: this second clone is a
plausible source for the unexplained branches immediately above.
**Not investigated further, not merged, not touched** — its `.git`
internals returned "the cloud file provider is not running" when checked,
so nothing there was even readable this session, let alone something to
act on unilaterally.

---

## P-029 — CI pipeline for the colour guard — DONE 2026-08-29, pushed 2026-08-31

**Scope, per P-028 item 7's amendment:** GitHub Actions workflow running
build, test, and `npm run check:color`; `stylelint-declaration-strict-value`
banning raw hex on colour properties; a CI grep rejecting Tailwind
arbitrary colour values (`bg-[#`, `text-[#`, `border-[#`). None of this
exists yet — P-028 shipped `scripts/check-color.mjs` runnable by hand only,
deliberately, so two live WCAG failures wouldn't sit behind infrastructure
that didn't exist yet. Repo currently has no `.github/workflows` and no
`stylelint`; standing up the pipeline is the first step, not an addition
to one.

**Should probably also resolve, or at least re-run against:** the 20/30
CVD-distinguishability findings P-028 left open (see above) — a CI gate
that goes live already red isn't a gate anyone will respect.

**Scope now depends on P-030 item 5 (2026-08-29).** `check-color.mjs`
was extended to validate both surfaces, resolve opacity modifiers by
alpha-compositing, and flag raw Tailwind palette colour classes
unconditionally. Wiring the pre-extension version into CI would have
been a gate that passed every defect P-030 exists to fix — including a
shipped defect on the app's own nav bar (item 1) and four newly
discovered Service-only CVD failures (slate/teal, all four
deficiency/severity combinations) that no prior pass, including P-028
itself, had ever run against Service's actual token values. The
extended check currently exits 1 against real work: 1310 raw-Tailwind-
colour sightings across 28 files (the pre-existing ~24-screen
legacy-dark-zinc backlog CLAUDE.md already documents, now enumerated
by file for the first time), 16 opacity-diluted contrast failures (4
sightings × 2 surfaces × 2 backgrounds), and the 4 new Service CVD
failures above — all reported in P-030 item 5's entry, none fixed
there. **This CI pipeline cannot go live gating the current tree as-is
— it would be red from the first run against ~1330 pre-existing
violations, none of which are regressions.** Before wiring the
GitHub Actions workflow, this prompt needs either (a) a baseline/
allowlist mechanism in the script itself so only NEW violations block
a PR, or (b) the backlog cleared first — a much larger undertaking
than originally scoped here, and Brian's call which.

**RULING (Brian, 2026-08-29): (a) — the gate ships baselined, not
blocked.** The ~1310 findings are the legacy-dark-zinc backlog awaiting
its own brand pass — a design job, not a lint job — and clearing it
first would delay the gate indefinitely while the thing it exists to
stop (a new, un-baselined defect) keeps shipping. Full ruling and the
three carve-out decisions are in item 1 below.

**Four commits, one per item, each independently verified** (`tsc
--noEmit`, `npm run build`, `npm test`, `check:color` against the
baseline):

- `09bc530` — item 1: `color-baseline.txt` (1318 entries) plus the
  baseline mechanism in `check-color.mjs` (grows-never-shrinks-silently
  gate: a current finding not in the baseline is NEW and fails, a
  baseline entry with no matching finding is STALE and also fails).
  Three carve-out rulings applied first, before writing anything:
  DishBuildPanel.tsx:411's disabled "Same as portions" label FIXED
  (`disabled:text-slate/40` → `disabled:text-slate`, now 4.90–6.12:1 in
  all four contexts — a disabled control the chef can't read can't
  explain why it's disabled); TrendsFullReport.tsx:248's decorative
  Sparkles icon BASELINED after confirming its empty-state message
  fully carries the meaning on its own (WCAG 1.4.11 decorative
  exemption genuinely applies), via a new, explicit `CARVE_OUT_
  EXEMPTIONS` mechanism rather than a threshold change; the Service
  slate/teal CVD finding EXCLUDED from the baseline entirely (worse
  than the one Day exception already on file — baselining something
  more severe than a documented exception would be incoherent),
  tracked instead via a `trackedIn: 'P-031'` field that prints loudly
  in every run, pass or fail, so it can't be mistaken for an oversight.
- `a7ae834` — item 2: `.github/workflows/ci.yml`, this repo's first —
  `npm ci` → lint (`tsc --noEmit`, added beyond the entry's literal
  wording since `vite build` doesn't itself type-check) → build → test
  → `check:color`. No secrets needed. Scoped to the root package;
  `functions/` isn't built/tested here yet.
- `2dc9a28` — item 3: `stylelint-declaration-strict-value` on
  `src/index.css` (5 pre-existing findings, all the `@media print`
  block's deliberate pure black/white/grey overrides, baselined via
  stylelint's own native `stylelint-disable-next-line` comments — no
  second baseline file needed for a tool that already has one) plus a
  new `scripts/check-arbitrary-color.mjs` rejecting Tailwind
  arbitrary-value hex classes (`bg-[#...]` etc.) — zero pre-existing
  hits, so this one ships as a zero-tolerance gate with no baseline at
  all. Both wired into the same CI workflow.
- Item 4 (this entry): the tracked count, reported below for Brian to
  paste into `ROADMAP.json` directly — that file lives in OneDrive, not
  this repo, per this file's own "Where things live" convention, so
  Claude Code doesn't write it.

**Tracked debt count, for `ROADMAP.json`:**
```json
"colorDebt": {
  "baselinedViolations": 1318,
  "asOf": "2026-08-29",
  "source": "color-baseline.txt (P-029)",
  "breakdown": { "raw-tailwind-colour": 1306, "opacity-diluted contrast": 12 }
}
```
Obvious-when-it-stops-shrinking is the whole point of this number: it
should only ever go down, one `--write-baseline` regeneration at a time,
as the legacy-dark-zinc screens get their brand pass. A tracked count
that goes UP means someone bypassed the gate, not that the debt grew
faster than it shrank.

**Found, not fixed, during item 3:** `npm install` reported 10
pre-existing dependency vulnerabilities (1 low, 7 moderate, 2 high) —
`npm ls`-traced to confirm none came from the new `stylelint`/
`stylelint-declaration-strict-value` packages: `body-parser` via
`express`, `brace-expansion`/`protobufjs`/`uuid` via `firebase-admin`'s
own dependency chain, and `xlsx` (no fix available upstream). All
pre-existed this prompt's work.

**Pushed to origin/main 2026-08-31** alongside P-021/P-026/P-030/P-031 —
`.github/workflows/ci.yml` is now live on the remote. Not a hosting
deploy (this prompt is repo/CI infrastructure, not app code), so "not
deployed" never applied to it the way it did to P-030; "pushed" is the
correct milestone here.

---

## P-030 — Surface parity: fix what only works in one surface — DONE 2026-08-29, deployed 2026-08-31

**Origin:** Brian's own both-surface measurement pass on P-026's
DishBuildPanel.tsx elements (asked for directly, after the P-026 closeout
had only run `check:color`, which is Day-only by its own docstring)
surfaced a token-system defect, not a component bug: `navy` flips with
surface, `cream` doesn't, so a flipping background collides with a fixed
text colour the moment the surface changes. The same request also asked
for an app-wide ghost-white-heading inventory, which found the identical
root cause (a fixed value against a flipping page background) in 8
further views beyond EventCalendar.

**Five commits, one per item, each independently verified** (`tsc
--noEmit`, `npm run build`, `npm test`, `check:color`):

- `bd85b97` — item 1: new token `--color-on-navy`, an inversion pair (at
  each surface, navy's value from the *other* surface) rather than an
  independent value — fixes `text-cream` on `bg-navy` measuring 1.00:1
  in Service at all 8 sites across 5 files, including the app's own
  active nav pill. `cream` itself untouched (still correct on `bg-teal`,
  a non-flipping token) — found `cream` on `bg-teal` is ALSO broken in
  Service (2.46:1, RecipesHub.tsx:40) for an unrelated reason; reported,
  not fixed.
- `6b34334` — item 2: the 10 ghost-white headings across 8 views ->
  `text-navy` (same treatment as EventCalendar's `eaf0b8b`). Two
  exceptions handled differently and correctly, not by the same rule:
  PrepChecklist.tsx/Settings.tsx sit inside a fixed `bg-zinc-950` island
  this prompt doesn't convert — `text-navy` there would have been a
  Day-specific regression (1.38:1, navy is dark in Day and the island
  never lightens), so they got `text-cream` instead, the deliberately
  correct fixed value for a background that itself never changes.
- `e6a0114` — item 3: `text-red-400` (raw Tailwind, invisible to
  `check:color`'s curated token list) -> `text-danger` at all three
  DishBuildPanel.tsx error banners — 2.77:1 Day was the failure;
  5.44/4.59:1 now.
- `30c08af` — item 4: `placeholder:text-slate/60` fixed at all 4 sites
  using it (not just DishBuildPanel.tsx) by dropping the opacity
  modifier entirely — checked every opacity level from 100% down and
  found NO safe dimmed value exists against these backgrounds (100% is
  the only value clearing 4.5:1, and only by a 4.90:1 margin on the
  tightest case). Full list of every other opacity-modified colour usage
  in the codebase reported in the commit, none of it touched.
- `9959bdd` — item 5: `check-color.mjs` extended to both surfaces,
  opacity-modifier alpha-compositing, and unconditional raw-Tailwind
  flagging. Found and fixed a real pre-existing imprecision while
  building the per-surface background resolution: the script's own
  `CREAM_TOKEN` constant pointed at the `cream` token (#F2EDE2, the
  on-dark-content token) instead of `bg-cool` (#F7F3EA, the actual page
  background) — never caused a false pass, but was checking against the
  wrong reference the whole time. Extending to Service surfaced a
  genuinely new, previously invisible finding nobody had asked about:
  slate/teal fails CVD distinguishability under both deuteranopia and
  protanopia, both severities, in Service (as low as 0.0208) — worse
  than the one Day exception P-028 already tracked, and never checked
  because nothing had ever run this check against Service. PROMPTS.md's
  P-029 entry updated per instruction: the CI pipeline cannot go live
  gating the current tree, which now fails the extended guard at ~1330
  pre-existing violations (1310 of them the raw-Tailwind legacy-dark-zinc
  backlog CLAUDE.md already named as a group, now enumerated by file for
  the first time).

**Final state:** `tsc --noEmit` clean, `npm run build` clean, `npm test`
184/184 throughout all five commits. `check:color` itself now correctly
exits 1 against the pre-existing backlog its extension surfaced — this
is the intended, expected result of item 5, not a regression, and none
of it was fixed in this prompt per its own closing instruction.

**Deployed 2026-08-31** — held at "not deployed, per instruction" for
two days after this prompt closed, alongside P-021/P-026/P-029/P-031,
until Brian ran the push-and-deploy sequence and verified both fixes
live on production in DAY and SERVICE (the navy/cream token collision —
the blank nav pill — and the 10 ghost-white headings).

**Findings surfaced here that belong to no existing prompt are logged
under P-031** (queued, not fixed in this pass): `cream` on `bg-teal`
failing in Service, the new Service-only slate/teal CVD failure, and the
legacy dark-zinc brand-pass items (EventCalendar's `text-zinc-500` sites
and its two off-palette icons).

---

## P-031 — Colour findings with no home prompt — PARTIALLY DONE (fix items 1–2 DONE, deployed 2026-08-31, commits dfa8119 + 1d6f719; the original findings-list items 2–3 — Service CVD + dark-zinc backlog — still QUEUED, unrelated numbering, see note below)

**Origin:** P-030's both-surface measurement and extended-`check-color`
work surfaced three findings that don't belong to P-030 itself (different
root causes than the navy/cream collision it fixed), to P-028 (already
closed), or to P-029 (the CI-pipeline prompt, which references them but
doesn't fix them). Logged here so they have a home and aren't lost
between prompts. **Items 1 and 2 are live accessibility defects on
already-shipped surfaces, not backlog** — they read as real WCAG/CVD
failures today, in Service, right now. Item 3 is backlog: part of the
already-documented ~24-screen legacy-dark-zinc migration, not a new
regression.

**Numbering note (added 2026-08-31):** two unrelated "item" sequences
exist in this entry. The list right below is the ORIGINAL findings list
(1 = cream/teal, 2 = CVD, 3 = dark-zinc backlog), logged 2026-08-29 and
never renumbered. Separately, the FIX work that shipped is tracked as
"P-031 item 1" (the on-teal token) and "P-031 item 2" (the teal-hover
token) — action items, assigned later, that happen to reuse "1" and "2."
Fix item 1 covers findings-list item 1's root cause but not its exact
site (see the item 1 outcome below); fix item 2 is the hover-affordance
follow-up discovered while verifying item 1, not findings-list item 2
(CVD) at all. Findings-list items 2 and 3 remain completely untouched.

**Findings:**

1. **`cream` on `bg-teal` fails in Service (2.46:1).** RecipesHub.tsx:40,
   the Recipe Builder/Menu/Collections/Development sub-tab active pill.
   Passes in Day (7.32:1). A different root cause from the navy/cream
   collision P-030 item 1 fixed: `teal` doesn't flip between surfaces the
   way `navy` does — it's a genuine accent token with distinct Day/Service
   values (`#0B564F` / `#3FA8A0`), not an inversion pair — so Service's
   teal is simply lighter, and closer to cream's fixed value, than Day's
   is. The `on-navy` fix (a token that flips opposite navy) doesn't apply
   here; there's nothing to invert against, since teal isn't defined as
   the opposite of anything. Needs its own ruling: darken Service's teal
   further (constrained by P-028's CVD calibration comments on teal —
   re-verify the slate/teal and navy/teal distances before touching it),
   introduce a dedicated `on-teal` token, or stop using `text-cream` on
   `bg-teal` and use a token that's already known to work in both
   surfaces instead.

2. **`slate`/`teal` fails CVD distinguishability in Service — worse than
   the one exception already on file.** Measured 0.0208 (protanopia,
   severity 1.0) and 0.0341 (deuteranopia, severity 1.0), both well under
   the 0.06 threshold; also fails both pairs at severity 0.5. For
   comparison, the sole existing accepted exception — `teal`/`danger`
   under protanopia@1.0, Day only — measures 0.0538, closer to threshold
   than this. No prior pass could have caught this: P-028 built the CVD
   check and calibrated `CVD_MIN_DE` itself, but ran it only against Day,
   the sole surface that existed to check at the time in that pass's own
   frame of reference. Needs a ruling on remedy (adjust Service's slate or
   teal value, find where the two are actually adjacent with opposed
   meaning and confirm a non-colour channel already carries it per the
   P-028 pattern, or accept a documented exception the way `teal`/`danger`
   already has one) before `check-color.mjs`'s `CVD_ACCEPTED_EXCEPTIONS`
   list is touched.

3. **The legacy dark-zinc views' brand pass**, first partially catalogued
   during the P-021 EventCalendar work: `EventCalendar.tsx` alone carries
   10 `text-zinc-500` sites measuring 4.12:1 against its `bg-zinc-950`
   cards (attendee counts, phone/email, empty states) — under the 4.5:1
   floor — plus two off-palette lucide icons beside its section headings:
   `CalendarDays` in `text-purple-400` (2.39:1 on cream) and `Contact` in
   `text-blue-400` (2.30:1), both far under the 3:1 non-text floor.
   `text-teal` (7.71:1 on cream) is the brand-correct replacement for
   both icons, matching `ChefDashboard.tsx`'s existing heading-icon
   convention. This is one file's slice of the full ~24-screen backlog
   `check-color.mjs`'s extended raw-Tailwind check now enumerates in full
   (P-030 item 5) — scope this prompt to EventCalendar specifically, or
   widen it to the full backlog, as a decision to make when this is
   picked up, not assumed here.

**Not fixed in this entry — log only, per instruction.**

### Item 1 — DONE 2026-08-29, commit dfa8119

Executed with a wider scope than the site originally named above: not
`RecipesHub.tsx:40`, but the identical `text-cream`/`bg-teal` collision
independently found in `BTN_ACTION` (`src/lib/formStyles.ts`), the
shared primary-button style used at 8 call sites across the app
(Recipes, Staff, Vendors, Features, EventCalendar, events/
EventDetailView, ingredients/InvoicePriceUpdate, AlertDialog) — same
root cause (`cream` fixed, teal's own Service value sitting too close to
it), much larger blast radius than the one site this item was originally
logged against. Fixed via a new `on-teal` token (reuses `on-navy`'s two
values: 7.32:1 Day, 5.03:1 Service resting) and a permanent
`on-teal vs teal` regression guard in `check-color.mjs`, mirroring the
existing `on-navy vs navy` guard. Full detail in the commit.

**`RecipesHub.tsx:40` — the site item 1 was originally logged against —
was NOT touched and remains open.** It carries its own inline
`bg-teal text-cream` (the Recipe Builder/Menu/Collections/Development
sub-tab active pill), same collision, different code path (not routed
through `BTN_ACTION`), outside the executed fix's scope. Still a live
Service-surface defect, needing its own fix.

**Baselined count unchanged at 1318.** The `text-cream`/`bg-teal`
pattern was invisible to every `check-color.mjs` check kind that existed
before item 1 — `color-baseline.txt` never referenced it (grepped to
confirm before committing), so there was nothing to remove. It's caught
going forward only by the new `on-teal vs teal` guard added in the same
commit.

**Stale-docstring root cause of the original "seven files" count above:**
`formStyles.ts`'s own docstring claimed `BTN_ACTION` was hand-copied into
seven files, missing `AlertDialog.tsx` (added to the app after the
docstring was last updated, never reconciled). That stale count is what
put the wrong number into currency before item 1's own grep corrected it
to eight. Docstring corrected in the same commit (dfa8119) that fixed the
token — not a separate change, and not needed again here.

### Hover-affordance follow-up — 2026-08-29 (proposal only, not applied)

Item 1's fix tightened `BTN_ACTION`'s hover dilution from
`hover:bg-teal/85` to `hover:bg-teal/95` to clear 4.5:1 contrast in
Service. Contrast is fixed; whether the hover still reads as a state
change is a separate question, checked here by actually looking at it —
a pixel-accurate standalone reproduction of the real CSS (the live app
sits behind real operator auth this session doesn't have and won't type
a password into) — rather than inferring an answer from the contrast
numbers alone.

**Verdict: it does not reliably read as a state change, especially in
Service.** Measured via CIEDE2000 (perceptibility scale: <1
imperceptible, 1–2 perceptible on close inspection, 2–10 clearly
perceptible) against actual browser-rendered pixel values (Chromium's
`color-mix(in oklab, ...)` output, sampled via canvas — not a linear-RGB
approximation):

- Day, current (`/95`): dE2000 2.99 — faintly visible, borderline.
- Service, current (`/95`): dE2000 **1.83** — indistinguishable from
  resting at normal viewing scale in a direct side-by-side screenshot.
- Day, old (`/85`, pre-item-1): dE2000 8.84 — obviously visible.
- Service, old (`/85`, pre-item-1): dE2000 6.37 — obviously visible (but
  this is the value that failed contrast, hence item 1's fix).

Root cause of the asymmetry: `teal` and `on-teal` sit on OPPOSITE sides
of each other's lightness in the two surfaces (`teal` is dark-on-light
in Day, light-on-dark in Service; `on-teal` is the reverse in each).
Diluting the background toward whatever's behind it moves the same
direction in both surfaces, so it interacts with contrast in opposite
ways — the exact tension that forced `/95` in the first place. Any
single scalar transformation applied uniformly through one shared
Tailwind utility (alpha dilution, a `brightness()` filter, anything
multiplicative) hits this same conflict: strengthening the shift enough
to read clearly in Service pushes Day's contrast down and vice versa,
because `/95` was already the tightest value that still clears contrast
— there's no room left to also make it more visible.

**Proposal: a dedicated `--color-teal-hover` token — a solid colour
swap, not an alpha dilution — with independently chosen Day/Service
values (the same construction `teal`/`danger`/`saffron` already use, not
an inversion pair).** This sidesteps the tension above entirely: each
surface's hover value is picked on its own terms, not derived from
teal's own value by a shared formula.

- **Day: `#073F3A`** (new value) — dE2000 7.38 vs resting teal (matches
  the old `/85`'s visibility), 10.10:1 contrast vs `on-teal` (comfortable
  margin above 4.5). The existing `navy-deep` token (Day: `#145A55`) was
  re-checked and confirmed still unusable here: 1.75 dE2000 against
  resting teal — isoluminant, matching the reason `formStyles.ts`'s own
  comment already gives for rejecting it (`navy-deep` and `teal` measure
  1.06:1 contrast against each other in Day, near-invisible as a swap).
- **Service: `#5FC0B8`** — dE2000 7.15 vs resting teal, 6.68:1 contrast
  vs `on-teal`. This is `navy-deep`'s EXISTING Service value (`#5FC0B8`,
  documented in `index.css` as "hover/pressed on accent") — never
  previously checked against `teal` specifically, only rejected for
  Day's isoluminance problem. It works well in Service. Not proposing to
  repoint `BTN_ACTION` at `navy-deep` directly: `navy-deep` has other
  consumers (e.g. `ChefDashboard.tsx`'s `bg-navy` Add Feature button
  hover, per CLAUDE.md's migration-status gap note) outside this item's
  scope, and reusing its VALUE in a new, separately-named token follows
  the same "a token is for its use context, not just its value"
  principle `on-teal` itself already established against `on-navy`.
- The border should move with the fill (`hover:border-teal-hover`
  alongside `hover:bg-teal-hover`) — the current `/95` treatment only
  dilutes the background, leaving `border-teal` at full opacity, a minor
  seam the dedicated-token construction should not repeat.

Confirmed visually in a standalone reproduction (exact CSS values, real
`:hover` state, verified live via `getComputedStyle`/`matches(':hover')`
before screenshotting, not assumed): the candidate is clearly,
unmistakably distinct from resting in both surfaces, unlike the current
`/95` in Service.

### Item 2 — DONE 2026-08-29, commit 1d6f719, deployed 2026-08-31

Approved as specified: Day `#073F3A`, Service `#5FC0B8`. Applied to
`BTN_ACTION`'s `hover:bg-teal` → `hover:bg-teal-hover` plus
`hover:border-teal-hover`, all 8 sites via the shared constant. New
`teal-hover`-vs-`on-teal` regression guard added to `check-color.mjs`,
mirroring item 1's `on-teal`-vs-`teal` guard; sanity-tested by
deliberately breaking the Service value (measured 1.00:1, guard fired
correctly) and restoring via `sed` (not `git checkout`, after item 1's
near-miss with that command on this same file the prior day). Documented
in CLAUDE.md as a PRINCIPLE, not just values: the hover deliberately
moves away from its own surface's baseline — darker in Day, lighter in
Service — and that asymmetry is not a defect to reconcile. Baselined
count unchanged at 1318. Pushed to origin/main and deployed (hosting)
2026-08-31 alongside P-021/P-026/P-029/P-030; Brian verified both the
resting-state fix (item 1) and the hover fix (item 2) live on production,
both surfaces.

---

## P-032 — Refinement state and field-targeting defects — ISSUED 2026-09-02 (items 1–3 DONE 2026-09-02, commits 051cf89 + 1a0cf81 + 3b4c5d1; awaiting the chef verification run before DONE)

**Origin:** live chef testing of P-026's dish-description intake, 2026-08-29 — local dev, real Firestore, real model calls, not a simulated or unit-test scenario.

**All four defects below were found by deviating from the written chef test script (P-019's entry) — ad-libbing refinement phrasings beyond what the script covers. The script as written still passes.**

**WHAT HELD — record this first: the P-019 gate.** Across every refinement below, corn and shallots stayed unit-flagged and Send to Recipe Builder stayed disabled. `hasUnresolvedLines` did its job; nothing reached Firestore. **No fix arising from this entry may weaken it.**

**DEFECT 1 — refinement computes from stale state.** Reproduced in a clean isolation run. Extraction from "...It makes 4 portions" → portions 4.
- "make it 6 portions" → portions 6 — CORRECT
- "double the batch" → portions 8 — WRONG (6 × 2 = 12; 8 is 4 × 2, the value from the ORIGINAL DESCRIPTION, not the draft)

In an earlier run the following refinement then doubled correctly from current state (8 → 16), so the behaviour is inconsistent, not uniformly stale. Suspect what the refinement call receives as `currentDraft`.

**DEFECT 2 — refinement writes to the wrong field.** "double the batch" changed PORTIONS, not BATCH YIELD. The instruction names the yield; the model moved the other field.

**DEFECT 3 — batch yield populated unprompted.** In an earlier run, batch yield came back "2 each" — never given by the chef, in a field the original extraction correctly left null — and it then satisfied `yieldNeedsAttention`, enabling Send on a model-invented yield. NOT reproduced in the isolation run (three refinements, yield stayed empty), so the trigger is one of two untested phrasings: "make it six portions" (spelled out) or "Double the portions". Same defect class as the unit-substitution silent fallback P-019 killed.

**DEFECT 4 — design gap, not a bug.** "make it 6 portions" changes portions and leaves every ingredient quantity untouched — correct per the 2026-08-21 immutable-kept-lines ruling, but the chef sees a rescaled dish with identical quantities and nothing explains why.

**Not investigated, not fixed — log only, per instruction.**

**Ruling (Claude.ai, 2026-09-02) — decided, not open. Three items, in
order, one commit each, verified before the next starts.**

**Root causes, read from the code (confirmed 2026-09-02 before any fix —
see the per-item notes below for where the code agrees and where it
adds a caveat):**

- **Defect 1 is NOT stale React state.** `handleRefine` sends the live
  `draft` as `currentDraft`. But the refinement payload also carries the
  original `description` ("makes 4 portions"), and
  `DISH_DRAFT_SYSTEM_PROMPT` never says which wins when `description` and
  `currentDraft` disagree on a number. The model anchored on the
  description's 4. That also explains the run-to-run inconsistency: with
  no precedence stated, which source the model anchors on is a coin
  flip.
- **Defects 2 and 3 share a root.** `batchYield` was `null` in
  `currentDraft`, so "double the batch" had nothing to double — the
  model either moved portions instead (2) or invented "2 each" (3). Same
  silent-fallback class P-019 killed for units.
- **Defect 4 is correct behaviour** (immutable kept lines, 2026-08-21
  ruling) with no explanation shown to the chef.

**ITEM 1 — precedence rule (prompt only, `src/lib/dishExtraction.ts`).**
In `DISH_DRAFT_SYSTEM_PROMPT`'s refinement paragraph, add: for a
refinement payload, `currentDraft` is the sole source of truth for every
numeric field (portions, batchYield, line quantities). `description` is
context for ingredient identity and method only. Where `description` and
`currentDraft` disagree on a number, `currentDraft` wins — the chef has
already changed it. Relative instructions ("double", "halve", "one more")
are computed from `currentDraft`'s value, never from the description. No
code change. Existing tests must still pass.

**ITEM 2 — null-field guard (code-enforced, `src/lib/dishExtraction.ts`
+ `DishBuildPanel.tsx`).** Rule: a refinement may not populate a field
that was `null` in `currentDraft` unless the refinement instruction
itself supplies an explicit absolute value. Enforced in code, not the
prompt:

- Extend `reconcileRefinement` (or add a sibling called from
  `handleRefine` — implementer's call, say which and why) to take the
  instruction string. For `batchYield` and `portions`: if `oldDraft`'s
  field is `null` and `revised`'s is non-null, accept only if the
  instruction contains an explicit number (digits, or a number word
  one–twelve / dozen / half). Relative words — double, triple, halve,
  more, less — do NOT count. Otherwise revert that field to `null` and
  return a list of reverted field names.
- `handleRefine`: when a field was reverted, show an inline line in the
  existing `refineError` slot, non-toast, per field: "Batch yield isn't
  set — give me the yield (e.g. '2 qt') and I'll apply it." / "Portions
  aren't set — tell me how many." The rest of the refinement still
  applies; only the reverted field is held back.
- Mirror the rule in the prompt: never populate a null field from a
  relative instruction; if the refinement targets a field that is null
  in `currentDraft` and gives no value, leave it null.
- Kept lines untouched. `hasUnresolvedLines` untouched. `canHandOff` /
  the Send gate untouched — this must not weaken the P-019 gate; the
  commit message states that it doesn't.
- Tests in `src/lib/dishExtraction.test.ts`: null yield + "double the
  batch" → yield stays null, reverted list names `batchYield`; null
  yield + "makes 2 quarts" → accepted; null portions + "make it six
  portions" → accepted (number word); non-null yield + "double the
  batch" → not touched by the guard (prompt's job).

**ITEM 3 — explanation caption (`DishBuildPanel.tsx` only).** After a
refinement changes portions or batchYield (compare pre/post in
`handleRefine`, set a transient flag cleared on the next refinement or
edit), render one caption in the existing saffron-soft caption style
under the yield/portions row: "Portions changed — ingredient quantities
are kept as written. Scale in the Recipe Builder after hand-off."
`Recipes.tsx` already has `scaleRecipe`/`scaleFactor`, so the pointer is
true; confirm it's reachable from the Builder the draft lands in before
using that wording. No new state beyond the flag.

**VERIFY (Brian runs, local dev, real model):** extraction from a
description ending "It makes 4 portions" → "make it 6 portions" →
"double the batch" (expect: portions 6 unchanged, inline yield-not-set
line, nothing invented) → "makes 2 quarts" (expect: yield 2 qt) →
"double the batch" (expect: 4 qt, portions still 6) → "Double the
portions" (expect: 12) → "make it six portions" (expect: 6). Corn and
shallots must stay unit-flagged and Send disabled throughout. Record the
run under P-032, then flip to DONE.

### Root causes — confirmed against the code 2026-09-02

All three read as stated. `handleRefine` sends the live `draft` (React
state at call time, no ref or stale closure in play), so defect 1 cannot
be stale state; the payload does carry `description` alongside
`currentDraft`, and the prompt's refinement paragraph said only "start
from currentDraft" — nothing about which wins on a number. `batchYield`
null in `currentDraft` is exactly the state the P-019 chef script leaves
the draft in (extraction correctly returns null when the description
gives no yield), so defects 2 and 3 were reachable on every run.

### Item 1 — DONE 2026-09-02, commit 051cf89

Prompt only. Added to the refinement paragraph: `currentDraft` is the
sole source of truth for every numeric field (portions, batchYield, line
quantities); `description` is context for ingredient identity and method
only; where the two disagree on a number, `currentDraft` wins; relative
instructions compute from `currentDraft`'s value, never from a number in
`description`. 15 existing tests pass unchanged, including the
no-persona / no-refusal word guards (the new text avoids every guarded
term). One new prompt assertion added in item 2's commit.

### Item 2 — DONE 2026-09-02, commit 1a0cf81

**Sibling, not extension.** `guardNullFields(oldDraft, revised,
instruction)` is a new pure function in `dishExtraction.ts`, called from
`handleRefine` on `reconcileRefinement`'s output — not folded into
`reconcileRefinement`. Reason: that function's contract is kept-line
immutability (line-level); the guard's is field population gated on the
instruction text (non-line fields). Separate signatures keep each
invariant independently testable, and `reconcileRefinement`'s callers
and five tests are untouched.

`hasExplicitNumber` is the gate: any digit, or a whole-word match on
one–twelve / dozen / half (so "tone", "tender", "halfway" don't count).
Relative words never count. If the instruction has no explicit number
and a field went null → non-null, that field reverts to null and is
named in the returned list; a field that was non-null is never guarded
(computing "double" from an existing value is item 1's job). The rest of
the refinement — dish name, lines, the other field — applies as normal
and the instruction still counts toward the 10-round history.

`handleRefine` renders one line per reverted field in the existing
`refineError` slot (`whitespace-pre-line` added so two fields render as
two lines), non-toast, verbatim from the ruling. The `'2 qt'` example
follows the kitchen's unit system (`'2 L'` for metric) — the one
deviation from the ruled text, so a metric kitchen isn't shown an
imperial example.

**P-019 gate not weakened, verified by diff:** no line touching
`canHandOff`, `hasUnresolvedLines`, `yieldNeedsAttention`, kept lines,
or the Send handler's early return changed (the only diff hit on those
names is a comment). The guard only ever moves a field toward null,
which every gate reads as "not ready".

Tests: 13 new (28 in the file, 197 across the suite) — the four ruled
cases, partial hold-back, both-fields-reverted ordering, no false revert
when the model correctly left the field null, `hasExplicitNumber`'s
word-boundary cases, and prompt assertions for items 1 and 2.

**Two rule edges, logged for a ruling — implemented exactly as ruled,
not widened:**

1. **The gate is instruction-wide, not field-targeted.** "make it six
   portions" against a null yield passes the gate (it contains a number
   word), so a yield the model invents *during that instruction* is
   accepted. That is defect 3's suspected trigger phrasing. The prompt
   mirror ("if the refinement targets a field that is null ... and gives
   no explicit value of its own, leave that field null") is the only
   defence on that path — exactly the not-trusted layer this item exists
   to back up in code. If the verification run's "make it 6 portions"
   step produces an invented yield, the fix is a field-targeted gate
   (number must sit near a yield/unit word for `batchYield`, near
   portion/serving/cover for `portions`), which is a heuristic the ruling
   deliberately did not ask for.
2. **"one more" contains "one".** The ruling lists "one more" as
   relative (item 1) and "one" as an explicit number word (item 2); by
   the letter of item 2, "one more portion" passes the gate. Against a
   non-null field it's harmless (not guarded). Against a null field it
   would let the model populate. Not special-cased.

### Item 3 — DONE 2026-09-02, commit 3b4c5d1

`DishBuildPanel.tsx` only. `handleRefine` compares portions and
batchYield before/after the guarded merge (`sameYield`: null-aware
qty/measureType/unit equality) and sets one transient `sizeChanged`
flag. Caption renders under the yield/portions row in the existing
saffron-soft caption style, wording verbatim from the ruling. Cleared at
the start of the next refinement, on Start Over, and on any chef edit to
the yield/portions row (portions, yield qty, measure type, unit, Same as
portions). No new state beyond the flag. A guard-reverted field
(null → null) never trips it — nothing changed.

**Pointer confirmed reachable, with a caveat.** `Recipes.tsx` renders
`CostPanel` (Batch Scale: 0.5× / 1× / 2× / custom, `scaleRecipe` +
`scaleFactor`) beside `RecipeEditor` for every selected recipe, no status
gate, so the development-status recipe the hand-off opens has it. But
that control scales the **Live Cost Analysis display only** — `scaled`
is a virtual recipe and nothing writes it back; the editor's line
quantities don't change. "Scale in the Recipe Builder" is therefore
true for seeing the cost at the new size, not for rewriting the lines.
Used the ruled wording as instructed; if the verification run shows the
chef expecting the Builder's lines to rescale, the caption wording (or
an actual apply-scale write in the Builder, a separate feature) needs
its own ruling.

**Also verbatim, flagged:** the caption says "Portions changed" even when
only batch yield changed (the flag covers both). One caption per the
ruling; wording didn't get a yield variant.

**Amendment (Claude.ai review, 2026-09-02) — DONE, commit noted in the
header line below.** The caption's second sentence ("Scale in the Recipe
Builder after hand-off.") implied the Builder rewrites line quantities;
Batch Scale only rescales the Live Cost Analysis display (the caveat
logged directly above). Caption is now exactly: "Portions changed —
ingredient quantities are kept as written." Nothing else changed —
flag, set/clear points, and styling are as in 3b4c5d1.

### VERIFY — pending (Brian, local dev, real model)

Not run in this session — the script requires the real model and the
chef's own pantry. Record the run here, then flip the header to DONE.
