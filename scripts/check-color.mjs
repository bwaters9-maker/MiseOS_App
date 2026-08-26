#!/usr/bin/env node
/**
 * P-028 item 7 (amended): a standalone, hand-run colour accessibility guard.
 * Not wired into CI in this pass — that's P-029. Run with `npm run check:color`.
 *
 * Checks, against design-tokens.json's Day-surface `colors` block:
 *   1. WCAG contrast >= 4.5 on cream and on white, for the tokens meant to be
 *      read as page-background ink (TEXT_TOKENS below).
 *   2. wordmark-saffron passes its own documented exception (>= 3.0, the
 *      WCAG 1.4.3 logotype/large-text threshold — NOT 4.5, and NOT a general
 *      text token). See CLAUDE.md's Wordmark entry.
 *   3. Saffron is never referenced as text/icon/border anywhere in src/ — a
 *      static grep, not a token check. wordmark-saffron is the one permitted
 *      exception, by construction (it is a different token name).
 *   4. For five ink pairs that sit near each other in lightness (slate/teal,
 *      teal/danger, navy/teal, navy/danger, slate/danger), simulate BOTH
 *      colours through deuteranopia/protanopia/tritanopia at severity 1.0
 *      AND 0.5 (anomalous trichromacy is the common real-world case, not
 *      full dichromacy) and assert the simulated colours are still at least
 *      OKLab Euclidean distance CVD_MIN_DE apart — empirically calibrated
 *      (see the constant's own comment), not an arbitrary round number.
 *
 * TEXT_TOKENS is a curated list, not a blind grep of every `text-*` class in
 * the codebase. Some tokens are used as text FOR a colour, not against the
 * page: every `text-cream` usage in this app sits on a `bg-navy`/`bg-teal`
 * fill (button and badge labels), never on the cream page background —
 * checking `cream` against itself would be a guaranteed, meaningless
 * failure. TEXT_TOKENS lists exactly the inks CLAUDE.md's Design System
 * section documents as read against the page/card background: navy
 * (primary ink), slate (secondary/muted), teal (interactive accent text),
 * danger (destructive/alert text).
 *
 * Exits 0 with a summary when everything passes. Exits 1 with a table of
 * every violation (what failed, against what, the measured value, the
 * required threshold) when anything doesn't — including a currently-known
 * finding, reported in the P-028 summary rather than silently patched here.
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
} from 'culori';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const TOKENS_PATH = join(REPO_ROOT, 'design-tokens.json');
const SRC_DIR = join(REPO_ROOT, 'src');

const CREAM_TOKEN = 'cream';
const WHITE_TOKEN = 'surface';
const TEXT_MIN_CONTRAST = 4.5;
const WORDMARK_TOKEN = 'wordmark-saffron';
const WORDMARK_MIN_CONTRAST = 3.0; // WCAG 1.4.3 logotype / large-text exception, not the general 4.5 bar
const TEXT_TOKENS = ['navy', 'slate', 'teal', 'danger'];

/**
 * Empirically calibrated 2026-08-26 (P-029 pre-work), replacing an initial
 * 0.15 set by analogy from CAM02-UCS dE numbers — a different metric on a
 * different scale, which made this OKLab check reject navy/teal even though
 * that pair measures dE~30 in CAM02 across all observers and reads as
 * visibly distinct. Recalibrated against two real anchors, both under
 * deuteranopia at severity 1.0 via this same differenceEuclidean('oklab'):
 *   - LOW  0.0298 — slate vs. the OLD teal (#1E7A74, pre-P-028): the known-
 *     real failure (1.06:1 WCAG contrast, the isoluminant pair that started
 *     the whole P-028 pass). Threshold must sit above this.
 *   - HIGH 0.1000 — navy vs. the CURRENT teal (#0B564F): known-good, reads
 *     as clearly distinct. Threshold must sit below this.
 * Midpoint of [0.0298, 0.1000] = 0.0649, rounded to 0.06. Re-derive both
 * anchors before ever moving this constant again — don't hand-tune it.
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

/** Any (text|border|stroke|fill)-saffron or ...-saffron-soft class, anywhere
 * in src/, that is NOT the permitted wordmark-saffron token. Tailwind
 * modifiers (e.g. `border-saffron/40`) still match — `\b` closes on the `/`. */
const SAFFRON_MISUSE = /\b(text|border|stroke|fill)-saffron(-soft)?\b/g;

function findSaffronMisuse() {
  const violations = [];
  for (const file of walkFiles(SRC_DIR, ['.tsx', '.ts'])) {
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

function main() {
  const raw = JSON.parse(readFileSync(TOKENS_PATH, 'utf8'));
  const tokens = resolveAliases(raw.colors);
  const violations = [];

  // 1. Text-token contrast vs cream and white.
  for (const name of TEXT_TOKENS) {
    if (!(name in tokens)) throw new Error(`TEXT_TOKENS references unknown token "${name}"`);
    for (const bgName of [CREAM_TOKEN, WHITE_TOKEN]) {
      const ratio = wcagContrast(tokens[name], tokens[bgName]);
      if (ratio < TEXT_MIN_CONTRAST) {
        violations.push({
          kind: 'contrast',
          detail: `${name} vs ${bgName}`,
          measured: ratio.toFixed(2),
          required: `>= ${TEXT_MIN_CONTRAST}`,
        });
      }
    }
  }

  // 2. Wordmark exception — its own, lower, documented threshold.
  for (const bgName of [CREAM_TOKEN, WHITE_TOKEN]) {
    const ratio = wcagContrast(tokens[WORDMARK_TOKEN], tokens[bgName]);
    if (ratio < WORDMARK_MIN_CONTRAST) {
      violations.push({
        kind: 'contrast (wordmark exception)',
        detail: `${WORDMARK_TOKEN} vs ${bgName}`,
        measured: ratio.toFixed(2),
        required: `>= ${WORDMARK_MIN_CONTRAST}`,
      });
    }
  }

  // 3. Saffron never a text/icon/border colour outside the wordmark lockup.
  for (const misuse of findSaffronMisuse()) {
    violations.push({
      kind: 'saffron-as-boundary-or-text',
      detail: `${misuse.file}:${misuse.line}  \`${misuse.match}\`  —  ${misuse.snippet}`,
      measured: 'present',
      required: 'absent (fill only; wordmark-saffron is the one exception)',
    });
  }

  // 4. CVD-simulated distinguishability for the five near-isoluminant pairs.
  for (const [aName, bName] of CVD_PAIRS) {
    for (const [defName, filterFn] of CVD_DEFICIENCIES) {
      for (const severity of CVD_SEVERITIES) {
        const sim = filterFn(severity);
        const distance = oklabDistance(sim(tokens[aName]), sim(tokens[bName]));
        if (distance < CVD_MIN_DE) {
          violations.push({
            kind: 'CVD distinguishability',
            detail: `${aName}/${bName} under ${defName} @ severity ${severity}`,
            measured: distance.toFixed(4),
            required: `>= ${CVD_MIN_DE}`,
          });
        }
      }
    }
  }

  if (violations.length === 0) {
    console.log(`check-color: OK — ${TEXT_TOKENS.length} text tokens, the wordmark exception, saffron placement, and ${CVD_PAIRS.length} pairs x ${CVD_DEFICIENCIES.length} deficiencies x ${CVD_SEVERITIES.length} severities all pass.`);
    process.exit(0);
  }

  console.error(`check-color: ${violations.length} violation(s)\n`);
  const kindWidth = Math.max(...violations.map(v => v.kind.length));
  for (const v of violations) {
    console.error(`  [${v.kind.padEnd(kindWidth)}]  ${v.detail}  —  measured ${v.measured}, required ${v.required}`);
  }
  process.exit(1);
}

main();
