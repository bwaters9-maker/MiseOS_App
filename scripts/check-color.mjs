#!/usr/bin/env node
/**
 * P-028 item 7 (amended), extended by P-030 item 5: a standalone,
 * hand-run colour accessibility guard. Not wired into CI in this pass —
 * that's P-029, whose scope now depends on this file (see its entry in
 * PROMPTS.md). Run with `npm run check:color`.
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
 * Exits 0 with a summary when everything passes (accepted exceptions do
 * not block this). Exits 1 with a table of every violation (what failed,
 * against what, the measured value, the required threshold) when
 * anything doesn't — an exit-1 here is always a real, un-accepted
 * finding, never one already known and documented.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
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

/* KNOWN TENSION (accepted 2026-08-22, Day surface only): teal/danger
   under protanopia@1.0 measures 0.0538 in Day, below threshold. Accepted
   because no surface relies on that pair by colour alone — links
   underlined, destructive buttons outlined+icon+label, FC% glyph+weight
   (P-028 items 4/5/6). If a future surface puts teal and danger adjacent
   with opposed meaning and no non-colour channel, that surface is
   wrong, not this threshold. Scoped to `surface: 'day'` deliberately —
   see the file header on why a Day-calibrated exception must not be
   assumed to cover Service, which assigns teal/danger different hex
   values entirely. */
const CVD_ACCEPTED_EXCEPTIONS = [
  { pair: ['teal', 'danger'], deficiency: 'protanopia', severity: 1.0, surface: 'day' },
];
const isAcceptedException = (aName, bName, defName, severity, surface) =>
  CVD_ACCEPTED_EXCEPTIONS.some(
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
  // pairs, against EACH surface's own token values.
  const triggeredExceptions = [];
  for (const surface of SURFACES) {
    const tokens = tokensBySurface[surface];
    for (const [aName, bName] of CVD_PAIRS) {
      for (const [defName, filterFn] of CVD_DEFICIENCIES) {
        for (const severity of CVD_SEVERITIES) {
          const sim = filterFn(severity);
          const distance = oklabDistance(sim(tokens[aName]), sim(tokens[bName]));
          if (distance < CVD_MIN_DE) {
            if (isAcceptedException(aName, bName, defName, severity, surface)) {
              triggeredExceptions.push({ detail: `[${surface}] ${aName}/${bName} under ${defName} @ severity ${severity}`, measured: distance.toFixed(4) });
              continue; // documented, accepted — see CVD_ACCEPTED_EXCEPTIONS above
            }
            violations.push({
              kind: 'CVD distinguishability',
              detail: `[${surface}] ${aName}/${bName} under ${defName} @ severity ${severity}`,
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
  const staleExceptions = CVD_ACCEPTED_EXCEPTIONS.filter(
    e => !triggeredExceptions.some(t => t.detail === `[${e.surface}] ${e.pair[0]}/${e.pair[1]} under ${e.deficiency} @ severity ${e.severity}`)
  );

  // 6. (P-030) Opacity-modified TEXT_TOKENS usage found in src/ — alpha-
  // composited against every surface x background combination, since a
  // static scan can't know the exact background a given sighting renders
  // against. Flags if ANY combination fails, same worst-case posture
  // check 1 already takes for the undiluted tokens.
  for (const sighting of findOpacityTextUsage()) {
    for (const surface of SURFACES) {
      const tokens = tokensBySurface[surface];
      for (const bgName of BACKGROUND_TOKENS) {
        const bgHex = compositeOver(tokens[bgName], tokens[bgName]);
        const blended = blendOpacity(compositeOver(tokens[sighting.token], tokens[bgName]), sighting.opacity, bgHex);
        const ratio = wcagContrast(blended, bgHex);
        if (ratio < TEXT_MIN_CONTRAST) {
          const prefix = sighting.isPlaceholder ? 'placeholder:text' : 'text';
          violations.push({
            kind: 'opacity-diluted contrast',
            detail: `${sighting.file}:${sighting.line}  \`${prefix}-${sighting.token}/${sighting.opacity}\` [${surface}] vs ${bgName}  —  ${sighting.snippet}`,
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
  for (const misuse of findRawTailwindColors()) {
    violations.push({
      kind: 'raw-tailwind-colour',
      detail: `${misuse.file}:${misuse.line}  \`${misuse.match}\`  —  ${misuse.snippet}`,
      measured: 'present',
      required: 'a design token (design-tokens.json), not a raw Tailwind palette class',
    });
  }

  if (violations.length === 0) {
    console.log(`check-color: OK — ${TEXT_TOKENS.length} text tokens, the wordmark exception, on-navy, saffron placement, ${CVD_PAIRS.length} CVD pairs, opacity-diluted usage, and raw-Tailwind-colour usage all pass, across both surfaces.`);
    if (triggeredExceptions.length > 0) {
      console.log(`  (${triggeredExceptions.length} accepted exception(s) excluded — see CVD_ACCEPTED_EXCEPTIONS:)`);
      for (const t of triggeredExceptions) console.log(`    ${t.detail}  —  measured ${t.measured}`);
    }
    if (staleExceptions.length > 0) {
      console.log(`  NOTE: ${staleExceptions.length} accepted exception(s) never matched a real measurement this run — stale, consider removing:`);
      for (const e of staleExceptions) console.log(`    [${e.surface}] ${e.pair[0]}/${e.pair[1]} under ${e.deficiency} @ severity ${e.severity}`);
    }
    process.exit(0);
  }

  console.error(`check-color: ${violations.length} violation(s)\n`);
  const kindWidth = Math.max(...violations.map(v => v.kind.length));
  for (const v of violations) {
    console.error(`  [${v.kind.padEnd(kindWidth)}]  ${v.detail}  —  measured ${v.measured}, required ${v.required}`);
  }
  if (triggeredExceptions.length > 0) {
    console.error(`\n  (${triggeredExceptions.length} accepted exception(s) excluded from the count above — see CVD_ACCEPTED_EXCEPTIONS:)`);
    for (const t of triggeredExceptions) console.error(`    ${t.detail}  —  measured ${t.measured}`);
  }
  process.exit(1);
}

main();
