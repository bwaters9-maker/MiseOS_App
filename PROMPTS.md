# PROMPTS.md

Decision log for changes to AI system prompts in this codebase. Each entry
records what changed, why, and what it replaced — so a future edit to a
persona or prompt has the reasoning behind the current version, not just
the text itself.

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

**Status:** QUEUED — not yet executed.

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
