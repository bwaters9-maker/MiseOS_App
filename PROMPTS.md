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
