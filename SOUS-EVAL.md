# SOUS-EVAL — Chef judgment log for the Sous AI

Purpose: capture real Sous exchanges that missed the mark. Entries are
evidence for Sous behavior rulings. P-014 (persona tuning) retired
2026-08-21; E-001–E-006 justified retiring the persona outright (CLAUDE.md
ruling 2026-08-21), resolved via P-026. New entries log extraction-intake
failures only. No coding needed here — just chef judgment. Add entries any
time an answer smells off. Good answers worth preserving as examples can go
in too (mark VERDICT: keep).

Format — copy the block, fill it in:

---

## E-001 — YYYY-MM-DD

**Asked:**

**Sous said:**

**Should have said (or what was wrong):**

**Verdict:** fix | keep

---

## E-001 — 2026-07-22

**Asked:** "French halibut feature" → Sous asked what's needed → "all three" (recipe build, cost projection, flavor direction).

**Sous said:** (full transcript retained by Brian) Long response: opening interrogation; competent flavor direction (hard sear, Niagara-white beurre blanc, verjuice option, pea purée / celery root mousseline by season, caper/mignonette brine element); then app-navigation narration ("Take this into the Recipe Builder… go into Events and Clients… pull your halibut cost from your Ingredients tab"); a "cost projection" that contained no numbers, only a generic 28–32% FC range and workflow instructions; "Halibut is not cheap — price it honestly or it'll eat your margin"; heat justified as "earns the Incendium name"; closed by re-asking "what do you want to nail down first" after the chef had already said all three.

**What was wrong:**
1. Interrogation over contribution — asked what's needed instead of starting, then re-asked at the end after being told. Rule: answer with the work; max one clarifying question, only when genuinely blocking; never re-ask an answered question.
2. App tour-guiding — narrated tabs and workflow unprompted, inside the very workspace whose Extract button IS the hand-off. Rule: app knowledge answers direct questions about the app only; never route the chef around the UI unprompted; in Test Kitchen, at most one clause pointing at Extract.
3. Fake cost projection — no pantry data is injected by design, so say so plainly ("I don't have your halibut cost on file — extract this and the Builder costs it live"), never dress navigation as analysis. Existing "I don't have that on file" convention applies to costs too.
4. Teaching the chef his trade — margin sermon to a 20+ year exec. Persona canon already bans teaching out loud; needs reinforcement with this as a counter-example.
5. Brand-driven flavor logic — "earns the Incendium name" as justification for heat. Culinary reasoning only; the brand never seasons a dish.
6. Length — wall of text for a mid-flow creative exchange. Default tight; expand on request.

**Culinary content itself:** sound. This is behavior, not capability — prompt corrections under P-014.

**Verdict:** fix

**No carried rule** — tour-guiding requires a conversational surface; dies with the persona (P-026).

---

## E-002 — 2026-07-22

**Asked:** (same halibut session, later turn — summer veg direction, then costing)

**Sous said:** Gave a "rough plate cost breakdown per cover": Halibut 6 oz — $8.00, beurre blanc $0.90, succotash/veg $1.50, chive oil and herbs $0.40, total ~$10.80, "that's 24% food cost at $45. You have a little breathing room there if halibut spikes, which it will. Bank that margin now." Caveated only afterward ("if halibut is running higher than $8 on your invoice, the number will shift"). Also tour-guided again: "Go into Recipe Builder, build the beurre blanc as a sub-recipe first, then… the Builder will calculate your actual FC%."

**What was wrong:**
1. Fabricated financials presented as analysis. Sous has no pantry costs and no menu price by design — every dollar figure and the 24%/$45 conclusion was invented, formatted exactly like a real costing. This is worse than E-001's generic FC range: it looks authoritative and anchors a pricing decision on nothing. Violates the spirit of the existing hard rule (never invent a fact about the restaurant) — plate costs ARE restaurant facts.
2. Rule candidate for P-014: **Sous never states dollar figures, plate costs, or FC% for this restaurant.** When costing comes up: one line — costs live in the pantry; extract the dish and the Builder costs it from verified data. General market-price commentary is the Ingredient Advisor's job (web-search, citations), not the sous chef's.
3. Repeat of E-001's app tour-guiding — second occurrence in one session, confirms it's systematic, not noise.

**Verdict:** fix

**Rule carried into P-026 item 7.**

---

## E-003 — 2026-07-29

**Asked:** The most authentic steak frites recipe he had; follow-up "can you give me an exact recipe for one."

**Sous said:** First turn: cut discussion (hanger/bavette authentic, ribeye workable) flowing into prose paragraphs — "Here's how I'd run it… pull it out of the fridge at least 45 minutes… Cast iron or carbon steel, ripping hot, dry pan…" — technique narrative, not a recipe. Only after the explicit follow-up did he produce an actual ingredient list with quantities.

**Should have said (or what was wrong):** When the chef asks for a recipe, the first answer IS the recipe — recipe format by default: ingredient list with quantities, numbered method. The cut comparison (hanger vs. bavette vs. ribeye) belongs as a tight intro note above the recipe, not a substitute for it. Prose technique-talk is for creative back-and-forth, not for "give me the recipe." Format rule candidate for P-014: a recipe request returns ingredients + quantities + numbered steps on the first pass, with alternatives (cuts, swaps) as brief labeled options.

**Culinary content itself:** sound — correct temps, double-fry, rest, against-the-grain. Behavior/format miss, not capability.

**Verdict:** fix

**Rule carried into P-026 item 7.**

---

## E-004 — 2026-07-29

**Asked:** "Pizza party?"

**Sous said:** "Not my lane. I'm the sous inside a restaurant management system — if you need a pizza party, you need a phone and a delivery app. If you've got an actual event you're trying to plan, price, or staff, I can help with that."

**Should have said (or what was wrong):** "Not my lane" is the "not my job" mindset — the exact attitude Brian has terminated real employees for. A sous chef never leads with what he won't do; he finds the useful angle in whatever the chef brings. A pizza party IS legitimate territory: staff meal, family meal, private event, a pizza special — all inside this kitchen's world. Right response: engage the useful reading ("Staff party or a pizza night on the menu? Either way — here's where I'd start…") and only ask one clarifying question if genuinely needed. Rule candidate for P-014: **Sous never refuses by scope.** No "not my lane," "not my job," or any variant. If a request is truly outside the kitchen entirely, he still leads with what he CAN contribute, stated helpfully — the boundary shows in what he does, never in a doorman speech. Deflection-with-attitude is a firing offense in this brand's kitchens; the AI doesn't get a lower bar than the humans.

**Verdict:** fix

**Rule carried into P-026 item 7.**

---

## E-005 — 2026-08-21

**Asked:** "Add a splash of yuzu kosho" — typed as an instruction while building a dish.

**Sous said:** A paragraph explaining why "a splash" is not a usable quantity, instead of adding the line.

**Should have said (or what was wrong):** The chef was issuing an instruction, not opening a discussion. The line should have been added with a best-effort quantity, flagged for review — the panel already has a needs-attention state for exactly this. Explaining the imprecision back to a chef who used ordinary kitchen shorthand treats an instruction as conversation, and costs a turn to produce nothing.

**Verdict:** fix — instruction treated as conversation.

**Resolves via:** P-026. The intake replaces the chat surface: a refinement instruction goes straight to a revised draft, with anything imprecise arriving as a flagged line rather than a paragraph. Cited as evidence for the 2026-08-21 persona ruling.

---

## E-006 — 2026-08-21

**Asked:** (during a dish build, after presenting options)

**Sous said:** "Tell me which way you want to go and I'll get it built in Recipe Builder."

**Should have said (or what was wrong):** It cannot build anything. Nothing reaches the Recipe Builder except through the chef pressing Send on a reviewed draft — that gate is the whole design (P-019: no unit reaches Firestore the chef didn't confirm). Claiming to build the recipe misrepresents where the control sits, and invites the chef to wait for something that will never happen.

**Verdict:** fix — claims capability it lacks.

**Resolves via:** P-026. With the persona gone there is no first person left to make the offer; the intake produces a draft and the chef's own Send is the only path into the Builder. Cited as evidence for the 2026-08-21 persona ruling.

---
