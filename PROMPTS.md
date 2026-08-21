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

**Status:** PARTIALLY EXECUTED (2026-08-21). Item 1's code half, item 3,
and item 4 are done. Item 2 does not yet pass: the `NODE_ENV` line is
still in `.env`, which is gitignored and machine-local. Remove that line
and re-run item 2 to close this out.

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
- **Measured effect of the fix** (simulated with a shell
  `NODE_ENV=production`, which overrides the `.env` value): entry bundle
  1,121,653 -> 916,145 bytes (-200.7 KB, -18.3%); all `dist/` JS
  1,737,157 -> 1,299,405 bytes (-427.5 KB, -25.2%). `jsxDEV` and
  `C:/dev/miseos` occurrences both drop from 2273 / 2271 to 0.
- **Still open:** the `NODE_ENV=development` line in `.env` has not been
  removed, so scope item 2 does not yet pass against a real build. `.env`
  is gitignored and machine-local — that edit is the operator's, not a
  repo change.
