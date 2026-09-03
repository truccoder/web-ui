#!/usr/bin/env node
/**
 * Checks the two translation bundles against each other.
 *
 * WHAT IT CATCHES THAT `tsc` DOES NOT. `Messages` is typed from `en.ts`, so a key missing from
 * `vi.ts` is a compile error and needs no script. What the compiler cannot see is the INSIDE of a
 * string: `t('post.commentCount', { count })` renders `${count}` by substitution, so a Vietnamese
 * line that spells the placeholder differently — or drops it — silently renders a sentence with a
 * hole in it, in one language only, on a screen nobody is looking at in that language.
 *
 * So this compares the placeholder SET per key across the two files, and the key sets themselves
 * as a cheap cross-check on the parse.
 *
 * Usage: `node scripts/i18n-parity.mjs` — exits non-zero on any mismatch.
 */

import { readFileSync } from 'node:fs';

const FILES = {
  vi: 'src/core/i18n/translations/vi.ts',
  en: 'src/core/i18n/translations/en.ts',
};

/**
 * Every leaf key in a bundle, with the placeholders its string uses.
 *
 * PARSED STRUCTURALLY RATHER THAN IMPORTED, because these are TypeScript modules with comments
 * between half the entries and this has to run under bare `node`. The shape it relies on is the
 * one Prettier enforces on this repo: one `name: {` or `name: '…'` per line.
 */
function parse(file) {
  const out = new Map();
  const stack = [];
  const lines = readFileSync(file, 'utf8').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;

    if (/^\},?$/.test(line)) {
      stack.pop();
      continue;
    }

    let m = /^([A-Za-z0-9_$]+):\s*\{$/.exec(line);
    if (m) {
      stack.push(m[1]);
      continue;
    }

    m = /^([A-Za-z0-9_$]+):\s*(.*)$/.exec(line);
    if (!m) continue;

    /**
     * THE VALUE MAY BE ON THE NEXT LINE, and missing that reads as a missing placeholder.
     * Prettier moves a long string under its key rather than splitting the literal, so
     * `sectionHint:` and `unfriendDesc:` in `en.ts` are two-line entries whose `${url}` /
     * `${name}` live on the second line — this script's first version reported both as English
     * dropping a placeholder that was there all along.
     */
    let value = m[2];
    for (let j = i + 1; !value.trim() && j < lines.length && j < i + 4; j++) {
      value = lines[j].trim();
      i = j;
    }

    const key = [...stack, m[1]].join('.');
    out.set(key, new Set([...value.matchAll(/\$\{(\w+)\}/g)].map((ph) => ph[1])));
  }
  return out;
}

const vi = parse(FILES.vi);
const en = parse(FILES.en);

const problems = [];

for (const key of vi.keys()) if (!en.has(key)) problems.push(`only in vi: ${key}`);
for (const key of en.keys()) if (!vi.has(key)) problems.push(`only in en: ${key}`);

for (const [key, viVars] of vi) {
  const enVars = en.get(key);
  if (!enVars) continue;
  const missing = [...enVars].filter((v) => !viVars.has(v));
  const extra = [...viVars].filter((v) => !enVars.has(v));
  if (missing.length || extra.length) {
    problems.push(
      `${key}: vi ${extra.length ? `has extra \${${extra.join('}, ${')}}` : ''}${
        missing.length && extra.length ? ' and ' : ''
      }${missing.length ? `is missing \${${missing.join('}, ${')}}` : ''}`
    );
  }
}

console.log(`vi: ${vi.size} keys · en: ${en.size} keys`);

if (problems.length) {
  console.error(`\n${problems.length} mismatch(es):`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}

console.log('\nKey sets and placeholders agree.');
