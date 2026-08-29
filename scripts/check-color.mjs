#!/usr/bin/env node
/**
 * P-028 item 7 (amended), extended by P-030 item 5, baselined by P-029
 * (2026-08-29): a standalone colour accessibility guard, now wired for
 * CI (P-029 item 2). Run with `npm run check:color`; regenerate the
 * baseline with `node scripts/check-color.mjs --write-baseline`.
 *
 * THE BASELINE (color-baseline.txt, repo root): P-029's ruling — the
 * gate ships against the app's real state, not blocked on clearing a
 * legacy-dark-zinc backlog that's a design job (its own future brand
 * pass), not a lint job. Two check kinds are baseline-eligible:
 * `raw-tailwind-colour` and `opacity-diluted contrast` — both are
 * source-scan findings with a real file:line, and both are the kind of
 * thing a screen accumulates before its brand pass, not a live "this
 * button is unreadable" defect. Every OTHER check (bare-token contrast,
 * the wordmark exception, on-navy, saffron misuse, and CVD
 * distinguishability) is NEVER baseline-eligible — those are the hard
 * floor, and baselining any of them would have hidden the exact defect
 * this file exists to catch (P-026 shipped an invisible button; five
 * green `check:color` runs certified half the app, because the guard
 * that ran was Day-only, opacity-blind, and had no concept of raw
 * Tailwind classes at all — see P-030).
 *
 * CARVE-OUT (P-029 ruling): a baseline-eligible finding measuring below
 * 2:1 — text that reads as blank, not merely low-contrast — is refused
 * baseline entry even though its KIND is normally eligible. `assertNoCarveOutViolations`
 * enforces this at write time: `--write-baseline` refuses to write a
 * file containing one. This isn't a live re-check on every `npm run
 * check:color` invocation (that would re-litigate a judgment call the
 * humans already made); it's a one-time gate on ever getting a sub-2:1
 * finding INTO the baseline in the first place. If a future finding
 * needs this same judgment call, `--write-baseline` will refuse and
 * name it — that's the intended trigger to ask for a ruling, not a
 * report to read past.
 *
 * THE GATE RULE: the baseline can only shrink. A current finding not in
 * the baseline is NEW and fails the gate outright — no severity
 * threshold, no grace period. A baseline entry with no matching current
 * finding is STALE — the underlying issue was fixed but the baseline
 * wasn't updated in the same commit — and also fails the gate, loudly,
 * specifically to enforce "removed from the code, removed from the
 * baseline, same commit." A clean run is exact equality between the
 * baseline file and the current findings it's allowed to cover, nothing
 * more, nothing less.
 *
 * TRACKED-NOT-ACCEPTED CVD exceptions (P-029 ruling on the Service
 * slate/teal finding, P-031): a `CVD_ACCEPTED_EXCEPTIONS` entry with a
 * `trackedIn` field (rather than a plain accepted-forever entry) is a
 * live, un-accepted defect deliberately excluded from the file baseline
 * — CVD findings have no file:line to baseline against in the first
 * place — and instead printed loudly, every run, in both the pass and
 * fail paths, so it can never be mistaken for an oversight or silently
 * amnestied the way a quiet baseline entry would. It still doesn't
 * block the gate (P-031 owns fixing it, not this one), but it is never
 * quiet about not blocking it.
 *
 * Checks, against design-tokens.json's `colors` block, resolved for
 * BOTH surfaces (Day as declared, Service overlaying `colors-service-
 * surface` on top of Day — the same cascade `[data-surface="service"]`
 * produces in src/index.css; a key absent from the Service block simply
 * keeps its Day value, exactly as an unlisted custom property does):
 *
 *   1. WCAG contrast >= 4.5 on the page background (`bg-cool`) and the
 *      card background (`surface`), for the tokens meant to be read as
 *      page-background ink (TEXT_TOKENS below) — in EACH surface.
 *   2. wordmark-saffron passes its own documented exception (>= 3.0, the
 *      WCAG 1.4.3 logotype/large-text threshold — NOT 4.5, and NOT a
 *      general text token) — in EACH surface. See CLAUDE.md's Wordmark
 *      entry.
 *   3. on-navy (P-030) is always navy's opposite lightness: contrast
 *      >= 4.5 against navy itself, in EACH surface. This is the
 *      permanent regression guard for the exact defect P-030 item 1
 *      fixed — a flipping background paired with a fixed-value text
 *      token collided to 1.00:1 in Service the moment the flip caught
 *      up with it.
 *   4. Saffron is never referenced as text/icon/border anywhere in
 *      src/ — a static grep, not a token check (surface-independent:
 *      component code never branches on the mode, so a misuse is
 *      equally wrong regardless of which surface happens to be active).
 *      wordmark-saffron is the one permitted exception, by construction
 *      (it is a different token name).
 *   5. For five ink pairs that sit near each other in lightness
 *      (slate/teal, teal/danger, navy/teal, navy/danger, slate/danger),
 *      simulate BOTH colours through deuteranopia/protanopia/tritanopia
 *      at severity 1.0 AND 0.5 (anomalous trichromacy is the common
 *      real-world case, not full dichromacy) and assert the simulated
 *      colours are still at least OKLab Euclidean distance CVD_MIN_DE
 *      apart — empirically calibrated (see the constant's own comment),
 *      not an arbitrary round number. Run against EACH surface's own
 *      token values, since Day and Service assign genuinely different
 *      hex values to every one of these tokens.
 *   6. (P-030) Every TEXT_TOKENS usage found in src/ with a Tailwind
 *      opacity modifier (e.g. `text-slate/60`, `placeholder:text-
 *      slate/60`) — alpha-composited over both backgrounds, in both
 *      surfaces, rather than skipped as the pre-P-030 version of this
 *      script did. A dimmed ink token is a real, different colour, not
 *      the same token that already passed check 1 — checking the
 *      undiluted token tells you nothing about whether some component
 *      diluted it into failure.
 *   7. (P-030) Any raw Tailwind palette colour class (e.g. `text-red-
 *      400`, `bg-zinc-950`, `bg-white`) on a colour-bearing property,
 *      anywhere in src/ — flagged unconditionally, with no exceptions
 *      list. This *will* surface the app's large pre-existing legacy-
 *      dark-zinc backlog (CLAUDE.md documents ~24 screens still on it,
 *      deliberately, pending their own brand pass) — that is expected,
 *      not a bug in this check. It exists so a NEW raw-Tailwind colour
 *      class never lands unnoticed again, the same way it already did
 *      three times in one prompt (P-030 items 1/3/4) before this
 *      check existed to catch it.
 *
 * TEXT_TOKENS is a curated list, not a blind grep of every `text-*` class
 * in the codebase for check 1/6. Some tokens are used as text FOR a
 * colour, not against the page: every `text-cream` usage in this app
 * sits on a `bg-navy`/`bg-teal` fill (button and badge labels), never on
 * the page/card background — checking `cream` against the page
 * background would be a guaranteed, meaningless failure, which is also
 * why the pre-P-030 version of this script's `CREAM_TOKEN` constant was
 * wrong: it pointed at the `cream` token (#F2EDE2, "light text-on-dark-
 * element") instead of `bg-cool` (#F7F3EA, the actual page background) —
 * close enough in value that every check still happened to pass, but the
 * wrong reference all the same. Fixed as part of this extension.
 * TEXT_TOKENS lists exactly the inks CLAUDE.md's Design System section
 * documents as read against the page/card background: navy (primary
 * ink), slate (secondary/muted), teal (interactive accent text), danger
 * (destructive/alert text). `on-navy` is deliberately excluded from it
 * for the identical reason `cream` is — it is never read against the
 * page background, only against `bg-navy` — and gets its own dedicated
 * check (3) instead.
 *
 * A CVD_ACCEPTED_EXCEPTIONS list (below CVD_PAIRS) can exempt one
 * specific pair/deficiency/severity/surface combination, each with a
 * comment recording WHY — for a real, measured, deliberately-accepted
 * tension, never as a way to silence an unexamined failure. The surface
 * field matters: an exception calibrated against Day's token values says
 * nothing about whether the same pair is fine in Service, which assigns
 * different hex values to every token — checking only Day is exactly the
 * blind spot this whole extension exists to close. An exempted
 * measurement still prints in the success summary, so it stays visible
 * instead of quietly vanishing, and a listed exception that no longer
 * matches any real failure is flagged as stale rather than left as dead
 * code.
 *
 * Exits 0 when every current finding is either passing, baselined, or a
 * tracked-not-accepted CVD exception. Exits 1 with a table of every NEW
 * finding and every STALE baseline entry (what changed, the measured
 * value, the required threshold) when either exists — an exit-1 here is
 * always a real change since the baseline was written, never a
 * pre-existing condition someone already ruled on.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, resolve } from 'node:path';
import {
  wcagContrast,
  filterDeficiencyDeuter,
  filterDeficiencyProt,
  filterDeficiencyTrit,
  differenceEuclidean,
  parse,
  formatHex,
} from 'culori';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const TOKENS_PATH = join(REPO_ROOT, 'design-tokens.json');
const SRC_DIR = join(REPO_ROOT, 'src');
const BASELINE_PATH = join(REPO_ROOT, 'color-baseline.txt');

const BG_COOL_TOKEN = 'bg-cool'; // the page background — was wrongly 'cream' pre-P-030
const SURFACE_TOKEN = 'surface'; // the card background
const BACKGROUND_TOKENS = [BG_COOL_TOKEN, SURFACE_TOKEN];
const TEXT_MIN_CONTRAST = 4.5;
const WORDMARK_TOKEN = 'wordmark-saffron';
const WORDMARK_MIN_CONTRAST = 3.0; // WCAG 1.4.3 logotype / large-text exception, not the general 4.5 bar
const TEXT_TOKENS = ['navy', 'slate', 'teal', 'danger'];
const ON_NAVY_TOKEN = 'on-navy';
const NAVY_TOKEN = 'navy';

const SURFACES = ['day', 'service'];

// Violation kinds a baseline entry may cover (P-029). Every other kind
// (contrast, wordmark, on-navy, saffron misuse, CVD) is an absolute
// floor — see the file header on why baselining any of those would
// defeat the point of this guard.
const BASELINE_ELIGIBLE_KINDS = new Set(['raw-tailwind-colour', 'opacity-diluted contrast']);

// A baseline-eligible finding measuring below this is refused baseline
// entry regardless of kind (P-029 ruling) — text that reads as blank,
// not merely low-contrast. Only meaningful for kinds with a real WCAG
// ratio (opacity-diluted contrast); raw-tailwind-colour findings have no
// "measured" ratio at all ("present") and never trigger this.
const CARVE_OUT_MAX_RATIO = 2.0;

/**
 * A sub-2:1 finding whose CONTENT is genuinely exempt from the contrast
 * requirement in the first place — not an exception to the carve-out
 * rule, but a case where the rule's premise ("text that needs to be
 * read") doesn't apply, so a human already examined it and ruled
 * accordingly. Every entry needs the same two things CVD_ACCEPTED_
 * EXCEPTIONS entries need: a violationKey() match and a comment
 * recording WHY, checked at the same moment the carve-out itself would
 * otherwise refuse — never a threshold change, never silent.
 *
 * TrendsFullReport.tsx:248 (P-029 ruling, 2026-08-29): a purely
 * decorative Sparkles icon in an empty-state panel, exempt under WCAG
 * 1.4.11 (non-text contrast doesn't apply to decoration). Checked before
 * exempting it: the panel's own message text (`text-xs text-slate`,
 * already passing at full opacity) sits directly below the icon and
 * fully carries the meaning in every branch (archived report not found /
 * generating / no briefing yet) — the icon is not the only thing marking
 * the panel, so 1.4.11's exemption genuinely applies rather than being
 * assumed.
 */
const CARVE_OUT_EXEMPTIONS = new Set([
  'opacity-diluted contrast|src/components/testkitchen/TrendsFullReport.tsx:248|text-slate/40 [day] vs bg-cool',
  'opacity-diluted contrast|src/components/testkitchen/TrendsFullReport.tsx:248|text-slate/40 [day] vs surface',
  'opacity-diluted contrast|src/components/testkitchen/TrendsFullReport.tsx:248|text-slate/40 [service] vs bg-cool',
  'opacity-diluted contrast|src/components/testkitchen/TrendsFullReport.tsx:248|text-slate/40 [service] vs surface',
]);

/**
 * Empirically calibrated 2026-08-26 (P-029 pre-work), replacing an initial
 * 0.15 set by analogy from CAM02-UCS dE numbers — a different metric on a
 * different scale, which made this OKLab check reject navy/teal even though
 * that pair measures dE~30 in CAM02 across all observers and reads as
 * visibly distinct. Recalibrated against two real anchors, both under
 * deuteranopia at severity 1.0 via this same differenceEuclidean('oklab'),
 * both against Day's token values:
 *   - LOW  0.0298 — slate vs. the OLD teal (#1E7A74, pre-P-028): the known-
 *     real failure (1.06:1 WCAG contrast, the isoluminant pair that started
 *     the whole P-028 pass). Threshold must sit above this.
 *   - HIGH 0.1000 — navy vs. the CURRENT teal (#0B564F): known-good, reads
 *     as clearly distinct. Threshold must sit below this.
 * Midpoint of [0.0298, 0.1000] = 0.0649, rounded to 0.06. Re-derive both
 * anchors before ever moving this constant again — don't hand-tune it.
 * Applied identically to both surfaces: this is a perceptual-distance
 * threshold, not a surface-specific value.
 */
const CVD_MIN_DE = 0.06;
const CVD_PAIRS = [
  ['slate', 'teal'],
  ['teal', 'danger'],
  ['navy', 'teal'],
  ['navy', 'danger'],
  ['slate', 'danger'],
];
const CVD_DEFICIENCIES = [
  ['deuteranopia', filterDeficiencyDeuter],
  ['protanopia', filterDeficiencyProt],
  ['tritanopia', filterDeficiencyTrit],
];
const CVD_SEVERITIES = [1.0, 0.5];

/**
 * Two different reasons a CVD finding can be excluded from blocking the
 * gate — never conflate them:
 *
 * ACCEPTED (no `trackedIn`): examined and ruled fine forever. The pair
 * genuinely is too close under this deficiency/severity, but no surface
 * relies on it by colour alone, so it isn't a real-world problem. Stays
 * excluded indefinitely; only revisit if a future surface actually puts
 * the pair adjacent with opposed meaning and no non-colour channel.
 *
 * TRACKED (`trackedIn` set): a real, un-accepted defect, deliberately
 * NOT fixed in the prompt that found it, owned by the named prompt
 * instead. Still excluded from the blocking count — this file's job is
 * "did anything change," not "re-relitigate a triage decision on every
 * run" — but printed loudly in BOTH the pass and fail paths (see main),
 * never tucked into the quiet "accepted" footnote a truly-fine pair
 * gets. A CVD finding has no file:line, so it can't go in the file
 * baseline the way raw-tailwind-colour/opacity findings do; this is its
 * only accounting.
 *
 * KNOWN TENSION (accepted 2026-08-22, Day surface only): teal/danger
 * under protanopia@1.0 measures 0.0538 in Day, below threshold. Accepted
 * because no surface relies on that pair by colour alone — links
 * underlined, destructive buttons outlined+icon+label, FC% glyph+weight
 * (P-028 items 4/5/6). Scoped to `surface: 'day'` deliberately — see the
 * file header on why a Day-calibrated exception must not be assumed to
 * cover Service, which assigns teal/danger different hex values
 * entirely.
 *
 * TRACKED, NOT ACCEPTED (P-029 ruling, 2026-08-29; owned by P-031):
 * slate/teal fails CVD distinguishability in Service under BOTH
 * deuteranopia and protanopia, at BOTH severities — as low as 0.0208,
 * worse than the one Day exception above. P-030's extension to Service
 * is what found this; nothing before it had ever run this check against
 * Service's actual token values. Explicitly excluded from
 * `color-baseline.txt` rather than silently baselined — see the file
 * header — because baselining something more severe than a documented,
 * examined exception would be incoherent.
 */
const CVD_ACCEPTED_EXCEPTIONS = [
  { pair: ['teal', 'danger'], deficiency: 'protanopia', severity: 1.0, surface: 'day' },
  { pair: ['slate', 'teal'], deficiency: 'deuteranopia', severity: 1.0, surface: 'service', trackedIn: 'P-031' },
  { pair: ['slate', 'teal'], deficiency: 'deuteranopia', severity: 0.5, surface: 'service', trackedIn: 'P-031' },
  { pair: ['slate', 'teal'], deficiency: 'protanopia', severity: 1.0, surface: 'service', trackedIn: 'P-031' },
  { pair: ['slate', 'teal'], deficiency: 'protanopia', severity: 0.5, surface: 'service', trackedIn: 'P-031' },
];
const findMatchingException = (aName, bName, defName, severity, surface) =>
  CVD_ACCEPTED_EXCEPTIONS.find(
    e => e.pair[0] === aName && e.pair[1] === bName && e.deficiency === defName
      && e.severity === severity && e.surface === surface
  );

const oklabDistance = differenceEuclidean('oklab');

/** design-tokens.json's colour values are all literal hex/rgba strings today
 * — no indirection. Resolve defensively anyway: if a value isn't a colour
 * literal, treat it as a reference to another key in the same block. */
function resolveAliases(block) {
  const resolved = {};
  const resolveOne = (key, seen = new Set()) => {
    if (resolved[key] !== undefined) return resolved[key];
    if (seen.has(key)) throw new Error(`Alias cycle in design-tokens.json colors: ${[...seen, key].join(' -> ')}`);
    const raw = block[key];
    if (raw == null) throw new Error(`design-tokens.json colors has no key "${key}"`);
    const isLiteral = /^#|^rgba?\(/i.test(raw);
    const value = isLiteral ? raw : resolveOne(raw, new Set([...seen, key]));
    resolved[key] = value;
    return value;
  };
  for (const key of Object.keys(block)) {
    if (key.startsWith('_')) continue; // e.g. "_comment"
    resolveOne(key);
  }
  return resolved;
}

/** The Service surface is Day's tokens with `colors-service-surface`'s
 * entries overlaid on top — exactly what `[data-surface="service"] { ... }`
 * does in src/index.css. A key absent from the override block (e.g.
 * `cream`, deliberately fixed) keeps its Day value, not a hole. */
function resolveServiceTokens(dayTokens, serviceRaw) {
  const overrides = resolveAliases(serviceRaw);
  return { ...dayTokens, ...overrides };
}

/** rgba(r,g,b,a) or rgb(r,g,b) -> opaque hex, composited over bgHex.
 * Service's wash tokens (saffron-soft, danger-wash, accent-wash) are
 * rgba() strings; every check here needs a real colour to compare, not a
 * translucent one, so composite it over whatever it's actually declared
 * on top of. */
function compositeOver(colorStr, bgHex) {
  const isLiteralHex = colorStr.startsWith('#');
  if (isLiteralHex) return colorStr;
  const m = colorStr.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (!m) throw new Error(`Unrecognized colour literal: ${colorStr}`);
  const [, r, g, b, a] = m;
  const alpha = a !== undefined ? parseFloat(a) : 1;
  const bg = parse(bgHex);
  const fr = parseFloat(r) / 255, fg = parseFloat(g) / 255, fb = parseFloat(b) / 255;
  return formatHex({
    mode: 'rgb',
    r: alpha * fr + (1 - alpha) * bg.r,
    g: alpha * fg + (1 - alpha) * bg.g,
    b: alpha * fb + (1 - alpha) * bg.b,
  });
}

/** Alpha-blend a token's own (opaque) colour at `opacityPct`/100 over a
 * background — this is what a Tailwind opacity modifier (`text-slate/60`)
 * actually renders, and what check 6 needs to evaluate a diluted ink
 * against a real background rather than the undiluted token. */
function blendOpacity(hex, opacityPct, bgHex) {
  const alpha = opacityPct / 100;
  const c = parse(hex), bg = parse(bgHex);
  return formatHex({
    mode: 'rgb',
    r: alpha * c.r + (1 - alpha) * bg.r,
    g: alpha * c.g + (1 - alpha) * bg.g,
    b: alpha * c.b + (1 - alpha) * bg.b,
  });
}

function walkFiles(dir, exts, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, exts, out);
    else if (exts.includes(extname(entry))) out.push(full);
  }
  return out;
}

const SRC_FILES = () => walkFiles(SRC_DIR, ['.tsx', '.ts']);

/** Any (text|border|stroke|fill)-saffron or ...-saffron-soft class, anywhere
 * in src/, that is NOT the permitted wordmark-saffron token. Tailwind
 * modifiers (e.g. `border-saffron/40`) still match — `\b` closes on the `/`. */
const SAFFRON_MISUSE = /\b(text|border|stroke|fill)-saffron(-soft)?\b/g;

function findSaffronMisuse() {
  const violations = [];
  for (const file of SRC_FILES()) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const match of line.matchAll(SAFFRON_MISUSE)) {
        const start = match.index;
        const precedingText = line.slice(0, start);
        if (precedingText.endsWith('wordmark-')) continue; // text-wordmark-saffron: the permitted exception
        violations.push({
          file: file.slice(REPO_ROOT.length + 1),
          line: i + 1,
          snippet: line.trim().slice(0, 120),
          match: match[0],
        });
      }
    });
  }
  return violations;
}

/** (P-030 item 5b) Every `text-{TOKEN}/{opacity}` or `placeholder:text-
 * {TOKEN}/{opacity}` usage in src/, for TOKEN in TEXT_TOKENS. Reports the
 * raw sighting; contrast is evaluated by the caller against every
 * surface x background combination, since a static scan can't know which
 * specific background a given usage renders against. */
const OPACITY_TEXT_RE = new RegExp(
  `\\b(placeholder:)?text-(${TEXT_TOKENS.join('|')})/(\\d{1,3})\\b`, 'g'
);

function findOpacityTextUsage() {
  const sightings = [];
  for (const file of SRC_FILES()) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const match of line.matchAll(OPACITY_TEXT_RE)) {
        sightings.push({
          file: file.slice(REPO_ROOT.length + 1),
          line: i + 1,
          snippet: line.trim().slice(0, 120),
          isPlaceholder: !!match[1],
          token: match[2],
          opacity: parseInt(match[3], 10),
        });
      }
    });
  }
  return sightings;
}

/** (P-030 item 5c) Any raw Tailwind default-palette colour class on a
 * colour-bearing property, anywhere in src/ — unconditional, no
 * exceptions list. Requires a numbered shade for palette names that
 * collide with this app's own brand tokens (`slate`, `teal`) so a bare
 * `text-slate`/`bg-teal` (the brand token, fine) is never mistaken for
 * `text-slate-400`/`bg-teal-600` (raw Tailwind, a violation). `white`/
 * `black` have no numbered variants in Tailwind, so they're matched
 * bare, with or without a trailing opacity modifier. */
const TAILWIND_PALETTE = [
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber',
  'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue',
  'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];
const COLOR_PROPS = ['text', 'bg', 'border', 'divide', 'ring', 'accent', 'fill', 'stroke', 'placeholder:text', 'placeholder:bg'];
const RAW_SHADE_RE = new RegExp(
  `\\b(${COLOR_PROPS.join('|')})-(${TAILWIND_PALETTE.join('|')})-(50|100|150|200|300|400|500|600|700|800|900|950)\\b`, 'g'
);
const RAW_BW_RE = new RegExp(
  `\\b(${COLOR_PROPS.join('|')})-(white|black)\\b`, 'g'
);

function findRawTailwindColors() {
  const violations = [];
  for (const file of SRC_FILES()) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const re of [RAW_SHADE_RE, RAW_BW_RE]) {
        for (const match of line.matchAll(re)) {
          violations.push({
            file: file.slice(REPO_ROOT.length + 1),
            line: i + 1,
            snippet: line.trim().slice(0, 120),
            match: match[0],
          });
        }
      }
    });
  }
  return violations;
}

/** Windows paths come back backslash-separated; the baseline file is
 * checked in and diffed on any OS, so normalize to forward slashes. */
const normalizeSlashes = p => p.replace(/\\/g, '/');

/** Stable identity for a baseline-eligible finding — file, line, and the
 * specific class/pairing, deliberately WITHOUT the measured ratio or the
 * source snippet. Matching on the measured value would make a baseline
 * entry brittle to any token-value tweak that shifts a ratio by a
 * hundredth without changing the underlying issue; matching on the
 * snippet would make it brittle to reformatting. Both baseline-eligible
 * kinds carry `file`/`line`/`classOrPairing` as plain fields (set where
 * the violation is constructed in main()) specifically so this never
 * needs to regex the human-readable `detail` string back apart. The
 * measured value is still recorded in the baseline FILE as the fourth
 * field — informational for a human reading it, never part of the match. */
function violationKey(v) {
  if (!BASELINE_ELIGIBLE_KINDS.has(v.kind)) {
    throw new Error(`violationKey called on a non-baseline-eligible kind: ${v.kind}`);
  }
  return `${v.kind}|${normalizeSlashes(v.file)}:${v.line}|${v.classOrPairing}`;
}

const BASELINE_HEADER = `# color-baseline.txt — known pre-existing check:color findings (P-029).
#
# THE RULE: this file only shrinks. Fixing a violation removes its line
# here in the SAME commit — a stale entry (baselined but no longer
# failing) breaks the gate exactly as loudly as a new, un-baselined one.
# Adding a line here for a NEW finding instead of fixing it requires the
# same review any other baseline addition would — this is debt with a
# name and a date, not a bypass.
#
# Only two check:color kinds are eligible: raw-tailwind-colour and
# opacity-diluted contrast (the legacy-dark-zinc-brand-pass backlog and
# already-dimmed text found before this baseline existed). Every other
# kind — bare-token contrast, the wordmark exception, on-navy, saffron
# misuse, CVD distinguishability — can NEVER appear below: baselining any
# of those would hide the exact class of defect this guard exists to
# catch. Regenerate with: node scripts/check-color.mjs --write-baseline
#
# Format: KIND|FILE:LINE|CLASS-OR-PAIRING|MEASURED
# MEASURED is informational only — matching uses the first three fields,
# not this one, so a token-value tweak that shifts a ratio slightly
# doesn't spuriously register as a new finding.
`;

function parseBaseline() {
  let raw;
  try {
    raw = readFileSync(BASELINE_PATH, 'utf8');
  } catch {
    return new Map(); // no baseline file yet — e.g. before the first --write-baseline
  }
  const entries = new Map();
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('|');
    if (parts.length !== 4) throw new Error(`Malformed color-baseline.txt line (expected 4 |-separated fields): ${trimmed}`);
    const [kind, fileLine, classOrPairing, measured] = parts;
    entries.set(`${kind}|${fileLine}|${classOrPairing}`, { measured, raw: trimmed });
  }
  return entries;
}

function formatBaselineLine(v) {
  return `${violationKey(v)}|${v.measured}`;
}

function writeBaseline(violations) {
  // "One line per known violation" (P-029) — dedupe by key, not by array
  // length: the same class can legitimately appear twice on one source
  // line (e.g. both branches of a ternary), which produces two array
  // entries with an identical key. That's one violation, not two.
  const lines = [...new Set(
    violations.filter(v => BASELINE_ELIGIBLE_KINDS.has(v.kind)).map(formatBaselineLine)
  )].sort();
  writeFileSync(BASELINE_PATH, BASELINE_HEADER + lines.join('\n') + '\n', 'utf8');
  return lines.length;
}

function main() {
  const raw = JSON.parse(readFileSync(TOKENS_PATH, 'utf8'));
  const dayTokens = resolveAliases(raw.colors);
  const serviceTokens = resolveServiceTokens(dayTokens, raw['colors-service-surface']);
  const tokensBySurface = { day: dayTokens, service: serviceTokens };

  const violations = [];

  // 1. Text-token contrast vs bg-cool and surface, in EACH surface.
  for (const surface of SURFACES) {
    const tokens = tokensBySurface[surface];
    for (const name of TEXT_TOKENS) {
      if (!(name in tokens)) throw new Error(`TEXT_TOKENS references unknown token "${name}"`);
      for (const bgName of BACKGROUND_TOKENS) {
        const fg = compositeOver(tokens[name], tokens[bgName]);
        const bg = compositeOver(tokens[bgName], tokens[bgName]);
        const ratio = wcagContrast(fg, bg);
        if (ratio < TEXT_MIN_CONTRAST) {
          violations.push({
            kind: 'contrast',
            detail: `[${surface}] ${name} vs ${bgName}`,
            measured: ratio.toFixed(2),
            required: `>= ${TEXT_MIN_CONTRAST}`,
          });
        }
      }
    }
  }

  // 2. Wordmark exception — its own, lower, documented threshold. Each surface.
  for (const surface of SURFACES) {
    const tokens = tokensBySurface[surface];
    for (const bgName of BACKGROUND_TOKENS) {
      const bg = compositeOver(tokens[bgName], tokens[bgName]);
      const ratio = wcagContrast(compositeOver(tokens[WORDMARK_TOKEN], tokens[bgName]), bg);
      if (ratio < WORDMARK_MIN_CONTRAST) {
        violations.push({
          kind: 'contrast (wordmark exception)',
          detail: `[${surface}] ${WORDMARK_TOKEN} vs ${bgName}`,
          measured: ratio.toFixed(2),
          required: `>= ${WORDMARK_MIN_CONTRAST}`,
        });
      }
    }
  }

  // 3. (P-030) on-navy is always navy's opposite lightness — the
  // permanent regression guard for the item-1 defect. Each surface.
  for (const surface of SURFACES) {
    const tokens = tokensBySurface[surface];
    const navyBg = compositeOver(tokens[NAVY_TOKEN], tokens[NAVY_TOKEN]);
    const ratio = wcagContrast(compositeOver(tokens[ON_NAVY_TOKEN], tokens[NAVY_TOKEN]), navyBg);
    if (ratio < TEXT_MIN_CONTRAST) {
      violations.push({
        kind: 'contrast (on-navy vs navy)',
        detail: `[${surface}] ${ON_NAVY_TOKEN} vs ${NAVY_TOKEN}`,
        measured: ratio.toFixed(2),
        required: `>= ${TEXT_MIN_CONTRAST}`,
      });
    }
  }

  // 4. Saffron never a text/icon/border colour outside the wordmark lockup.
  // Surface-independent: component code never branches on the mode.
  for (const misuse of findSaffronMisuse()) {
    violations.push({
      kind: 'saffron-as-boundary-or-text',
      detail: `${misuse.file}:${misuse.line}  \`${misuse.match}\`  —  ${misuse.snippet}`,
      measured: 'present',
      required: 'absent (fill only; wordmark-saffron is the one exception)',
    });
  }

  // 5. CVD-simulated distinguishability for the five near-isoluminant
  // pairs, against EACH surface's own token values. Never baseline-
  // eligible — see CVD_ACCEPTED_EXCEPTIONS above for the only two ways
  // a CVD finding can avoid blocking the gate.
  const acceptedExceptions = [];
  const trackedExceptions = [];
  for (const surface of SURFACES) {
    const tokens = tokensBySurface[surface];
    for (const [aName, bName] of CVD_PAIRS) {
      for (const [defName, filterFn] of CVD_DEFICIENCIES) {
        for (const severity of CVD_SEVERITIES) {
          const sim = filterFn(severity);
          const distance = oklabDistance(sim(tokens[aName]), sim(tokens[bName]));
          if (distance < CVD_MIN_DE) {
            const match = findMatchingException(aName, bName, defName, severity, surface);
            const detail = `[${surface}] ${aName}/${bName} under ${defName} @ severity ${severity}`;
            if (match?.trackedIn) {
              trackedExceptions.push({ detail, measured: distance.toFixed(4), trackedIn: match.trackedIn });
              continue; // real, un-accepted — excluded from the count, never quiet about it (see main's printing)
            }
            if (match) {
              acceptedExceptions.push({ detail, measured: distance.toFixed(4) });
              continue; // examined, accepted forever — see CVD_ACCEPTED_EXCEPTIONS above
            }
            violations.push({
              kind: 'CVD distinguishability',
              detail,
              measured: distance.toFixed(4),
              required: `>= ${CVD_MIN_DE}`,
            });
          }
        }
      }
    }
  }

  // An exception nobody's measurement matches is stale — either the tokens
  // moved and it's no longer needed, or it was mistyped. Not a failure, but
  // worth surfacing rather than letting dead code sit silently.
  const allTriggered = [...acceptedExceptions, ...trackedExceptions];
  const staleExceptions = CVD_ACCEPTED_EXCEPTIONS.filter(
    e => !allTriggered.some(t => t.detail === `[${e.surface}] ${e.pair[0]}/${e.pair[1]} under ${e.deficiency} @ severity ${e.severity}`)
  );

  // 6. (P-030) Opacity-modified TEXT_TOKENS usage found in src/ — alpha-
  // composited against every surface x background combination, since a
  // static scan can't know the exact background a given sighting renders
  // against. Flags if ANY combination fails, same worst-case posture
  // check 1 already takes for the undiluted tokens. Baseline-eligible.
  for (const sighting of findOpacityTextUsage()) {
    for (const surface of SURFACES) {
      const tokens = tokensBySurface[surface];
      for (const bgName of BACKGROUND_TOKENS) {
        const bgHex = compositeOver(tokens[bgName], tokens[bgName]);
        const blended = blendOpacity(compositeOver(tokens[sighting.token], tokens[bgName]), sighting.opacity, bgHex);
        const ratio = wcagContrast(blended, bgHex);
        if (ratio < TEXT_MIN_CONTRAST) {
          const prefix = sighting.isPlaceholder ? 'placeholder:text' : 'text';
          const classOrPairing = `${prefix}-${sighting.token}/${sighting.opacity} [${surface}] vs ${bgName}`;
          violations.push({
            kind: 'opacity-diluted contrast',
            file: sighting.file,
            line: sighting.line,
            classOrPairing,
            detail: `${sighting.file}:${sighting.line}  \`${classOrPairing}\`  —  ${sighting.snippet}`,
            measured: ratio.toFixed(2),
            required: `>= ${TEXT_MIN_CONTRAST}`,
          });
        }
      }
    }
  }

  // 7. (P-030) Raw Tailwind palette colours on colour-bearing properties —
  // unconditional, no exceptions list. See file header on why this is
  // expected to surface a large pre-existing list, not a bug in the check.
  // Baseline-eligible.
  for (const misuse of findRawTailwindColors()) {
    violations.push({
      kind: 'raw-tailwind-colour',
      file: misuse.file,
      line: misuse.line,
      classOrPairing: misuse.match,
      detail: `${misuse.file}:${misuse.line}  \`${misuse.match}\`  —  ${misuse.snippet}`,
      measured: 'present',
      required: 'a design token (design-tokens.json), not a raw Tailwind palette class',
    });
  }

  // --- --write-baseline: regenerate the file and exit, no gate logic ---
  if (process.argv.includes('--write-baseline')) {
    const eligible = violations.filter(v => BASELINE_ELIGIBLE_KINDS.has(v.kind));
    const carveOuts = eligible.filter(v => {
      const ratio = parseFloat(v.measured);
      return !isNaN(ratio) && ratio < CARVE_OUT_MAX_RATIO && !CARVE_OUT_EXEMPTIONS.has(violationKey(v));
    });
    if (carveOuts.length > 0) {
      console.error(`check-color --write-baseline: refused — ${carveOuts.length} finding(s) measure below ${CARVE_OUT_MAX_RATIO}:1, the carve-out floor (P-029 ruling). These read as blank, not merely low-contrast, and may not be baselined at any severity threshold without an explicit, examined CARVE_OUT_EXEMPTIONS entry. Fix them, or add a reviewed exemption, then re-run --write-baseline:\n`);
      for (const v of carveOuts) console.error(`  ${v.detail}  —  measured ${v.measured}`);
      process.exit(1);
    }
    const exempted = eligible.filter(v => {
      const ratio = parseFloat(v.measured);
      return !isNaN(ratio) && ratio < CARVE_OUT_MAX_RATIO && CARVE_OUT_EXEMPTIONS.has(violationKey(v));
    });
    if (exempted.length > 0) {
      console.log(`check-color --write-baseline: ${exempted.length} sub-${CARVE_OUT_MAX_RATIO}:1 finding(s) baselined anyway via an examined CARVE_OUT_EXEMPTIONS entry (see the constant's own comments for why):`);
      for (const v of exempted) console.log(`  ${v.detail}  —  measured ${v.measured}`);
    }
    const blocking = violations.filter(v => !BASELINE_ELIGIBLE_KINDS.has(v.kind));
    if (blocking.length > 0) {
      console.error(`check-color --write-baseline: refused — ${blocking.length} finding(s) are of a kind that can never be baselined (contrast, wordmark, on-navy, saffron misuse, or un-tracked CVD). Fix them; --write-baseline only ever covers raw-tailwind-colour and opacity-diluted contrast:\n`);
      for (const v of blocking) console.error(`  [${v.kind}]  ${v.detail}  —  measured ${v.measured}`);
      process.exit(1);
    }
    const count = writeBaseline(eligible);
    console.log(`check-color --write-baseline: wrote ${count} entries to ${BASELINE_PATH.slice(REPO_ROOT.length + 1)}.`);
    process.exit(0);
  }

  // --- Normal run: split into always-blocking vs baseline-eligible, and
  // diff the eligible half against the baseline file. ---
  const alwaysBlocking = violations.filter(v => !BASELINE_ELIGIBLE_KINDS.has(v.kind));
  const eligible = violations.filter(v => BASELINE_ELIGIBLE_KINDS.has(v.kind));

  const baseline = parseBaseline();
  const currentKeys = new Set();
  const newFindings = [];
  for (const v of eligible) {
    const key = violationKey(v);
    currentKeys.add(key);
    if (!baseline.has(key)) newFindings.push(v);
  }
  const staleBaselineEntries = [...baseline.entries()].filter(([key]) => !currentKeys.has(key));

  const printTracked = (log) => {
    if (trackedExceptions.length === 0) return;
    log(`\n  ${trackedExceptions.length} TRACKED, NOT ACCEPTED CVD finding(s) — real defects, deliberately excluded from this gate, owned elsewhere. Not a pass; not silence:`);
    for (const t of trackedExceptions) log(`    [owned by ${t.trackedIn}] ${t.detail}  —  measured ${t.measured}`);
  };

  const ok = alwaysBlocking.length === 0 && newFindings.length === 0 && staleBaselineEntries.length === 0;

  if (ok) {
    console.log(`check-color: OK — ${TEXT_TOKENS.length} text tokens, the wordmark exception, on-navy, saffron placement, and ${CVD_PAIRS.length} CVD pairs all pass (or are accepted/tracked exceptions) across both surfaces. ${baseline.size} pre-existing finding(s) match the baseline exactly.`);
    if (acceptedExceptions.length > 0) {
      console.log(`  (${acceptedExceptions.length} accepted exception(s) excluded — see CVD_ACCEPTED_EXCEPTIONS:)`);
      for (const t of acceptedExceptions) console.log(`    ${t.detail}  —  measured ${t.measured}`);
    }
    printTracked(console.log);
    if (staleExceptions.length > 0) {
      console.log(`  NOTE: ${staleExceptions.length} accepted/tracked exception(s) never matched a real measurement this run — stale, consider removing:`);
      for (const e of staleExceptions) console.log(`    [${e.surface}] ${e.pair[0]}/${e.pair[1]} under ${e.deficiency} @ severity ${e.severity}${e.trackedIn ? ` (tracked in ${e.trackedIn})` : ''}`);
    }
    process.exit(0);
  }

  console.error(`check-color: ${alwaysBlocking.length} blocking violation(s), ${newFindings.length} NEW (un-baselined) finding(s), ${staleBaselineEntries.length} STALE baseline entr(y/ies)\n`);

  if (alwaysBlocking.length > 0) {
    console.error(`  --- Blocking (never baseline-eligible) ---`);
    const kindWidth = Math.max(...alwaysBlocking.map(v => v.kind.length));
    for (const v of alwaysBlocking) {
      console.error(`  [${v.kind.padEnd(kindWidth)}]  ${v.detail}  —  measured ${v.measured}, required ${v.required}`);
    }
  }
  if (newFindings.length > 0) {
    console.error(`\n  --- NEW findings not in color-baseline.txt (fix them, or add deliberately with --write-baseline after review) ---`);
    for (const v of newFindings) console.error(`  [${v.kind}]  ${v.detail}  —  measured ${v.measured}, required ${v.required}`);
  }
  if (staleBaselineEntries.length > 0) {
    console.error(`\n  --- STALE baseline entries (fixed in code but still listed — remove from color-baseline.txt in this same commit) ---`);
    for (const [, entry] of staleBaselineEntries) console.error(`  ${entry.raw}`);
  }
  if (acceptedExceptions.length > 0) {
    console.error(`\n  (${acceptedExceptions.length} accepted exception(s) excluded from the counts above — see CVD_ACCEPTED_EXCEPTIONS:)`);
    for (const t of acceptedExceptions) console.error(`    ${t.detail}  —  measured ${t.measured}`);
  }
  printTracked(console.error);
  process.exit(1);
}

main();
