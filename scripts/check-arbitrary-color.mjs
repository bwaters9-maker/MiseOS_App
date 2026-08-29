#!/usr/bin/env node
/**
 * P-029 item 3: rejects Tailwind arbitrary colour values — `bg-[#1a2b3c]`,
 * `text-[#fff]`, `border-[#123abc]`, etc. — anywhere in src/. These bypass
 * BOTH the design token system and the named Tailwind palette (the thing
 * check-color.mjs's raw-tailwind-colour check catches): a raw hex typed
 * directly into a class string, invisible to every other guard in this
 * repo. Zero pre-existing hits as of 2026-08-29 (grep-verified before
 * writing this script), so this is a zero-tolerance gate from day one —
 * no baseline file, unlike check-color.mjs's raw-tailwind-colour check,
 * which inherited a large pre-existing backlog this pattern never had.
 *
 * Property list matches check-color.mjs's COLOR_PROPS for the same
 * reason it does there: broader than the three examples in P-029's own
 * wording (bg-[#, text-[#, border-[#) so a class like `ring-[#123456]`
 * or `placeholder:text-[#123456]` doesn't slip through a narrower list.
 *
 * Exits 0 with nothing printed when clean. Exits 1 with a file:line list
 * when anything is found — there is no accepted-exception mechanism for
 * this check, unlike check-color.mjs; an arbitrary hex value has no
 * legitimate use case in a token-based design system, ever.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SRC_DIR = join(REPO_ROOT, 'src');

const COLOR_PROPS = ['text', 'bg', 'border', 'divide', 'ring', 'accent', 'fill', 'stroke', 'placeholder:text', 'placeholder:bg'];
const ARBITRARY_HEX_RE = new RegExp(`\\b(${COLOR_PROPS.join('|')})-\\[#[0-9a-fA-F]{3,8}\\]`, 'g');

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

function main() {
  const violations = [];
  for (const file of walkFiles(SRC_DIR, ['.tsx', '.ts'])) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const match of line.matchAll(ARBITRARY_HEX_RE)) {
        violations.push({
          file: file.slice(REPO_ROOT.length + 1).replace(/\\/g, '/'),
          line: i + 1,
          match: match[0],
          snippet: line.trim().slice(0, 120),
        });
      }
    });
  }

  if (violations.length === 0) {
    console.log('check-arbitrary-color: OK — no Tailwind arbitrary colour values found.');
    process.exit(0);
  }

  console.error(`check-arbitrary-color: ${violations.length} violation(s) — arbitrary colour values bypass the token system entirely, no exceptions:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  \`${v.match}\`  —  ${v.snippet}`);
  }
  process.exit(1);
}

main();
