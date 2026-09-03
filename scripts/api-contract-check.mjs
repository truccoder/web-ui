#!/usr/bin/env node
/**
 * Checks every request this app makes against the backend's own OpenAPI document.
 *
 * WHY IT EXISTS. `docs/backend-plan.md` records the failure mode in one line: "Response gõ tay ở
 * tầng `api/` (FE) không được compiler canh" — the paths and verbs in `src/features/<feature>/api/*.ts`
 * are string literals, so a backend that renames a route, changes a verb or drops an endpoint
 * compiles perfectly on this side and breaks at runtime. Regenerating `schema.gen.ts` shows what
 * MOVED; nothing showed what this app still CALLS that no longer exists.
 *
 * It reads the generated `schema.gen.ts` rather than the live server on purpose: the file is what
 * the types are built from, so a stale file is itself a finding, and the check runs with no
 * backend up. Regenerate first when the backend has changed:
 *
 *   npx openapi-typescript@7 http://localhost:8080/v3/api-docs -o src/core/api/schema.gen.ts
 *
 * Usage: `node scripts/api-contract-check.mjs` — exits non-zero if anything is unmatched.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SCHEMA = 'src/core/api/schema.gen.ts';
const ROOTS = ['src/features', 'src/core/api'];

/**
 * The paths the generated schema declares, and which verbs each one answers.
 *
 * The generated shape is `"/v1/api/x": { get: operations["…"]; put?: never; … }` — a verb the
 * route does NOT serve is written as `never`, which is exactly the distinction this needs.
 */
function schemaRoutes() {
  const source = readFileSync(SCHEMA, 'utf8');
  const body = source.slice(
    source.indexOf('export interface paths'),
    source.indexOf('export type webhooks')
  );

  const routes = new Map();
  const pathRe = /^ {4}"(\/v1\/api\/[^"]*)":\s*\{$/gm;
  let match;
  while ((match = pathRe.exec(body))) {
    const start = match.index + match[0].length;
    const end = body.indexOf('\n    };', start);
    const block = body.slice(start, end === -1 ? undefined : end);
    const verbs = new Set();
    for (const verb of ['get', 'put', 'post', 'delete', 'patch']) {
      // Single-quoted, not a template literal: `\s` inside a template resolves to a plain `s`,
      // which silently turns this into `^s{8}get` and reports every route as answering nothing.
      const declared = new RegExp('^ {8}' + verb + '\??:\s*(?!never)', 'm');
      if (declared.test(block)) verbs.add(verb);
    }
    routes.set(match[1], verbs);
  }
  return routes;
}

/** Every `.ts`/`.tsx` file under the roots. */
function sourceFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
    }
  };
  ROOTS.forEach(walk);
  return out;
}

/**
 * Every `api.<verb>('/v1/api/…')` call site, with its template holes turned into `{}`.
 *
 * Tests are skipped by `sourceFiles` because they name paths that are deliberately fictional —
 * `axios.test.ts` asserts what the guest allow-list does with `/v1/api/trending/sources`, a route
 * that has never existed and is the point of the case.
 */
function callSites() {
  const calls = [];
  // `[^(]*` SKIPS THE GENERIC WITHOUT PARSING IT. The type argument nests arbitrarily —
  // `api.get<Partial<Record<ReactionType, number>>>(…)` is three deep — and every fixed-depth
  // `<…>` pattern silently skipped the call sites deeper than it handled, which then read as
  // endpoints this app never calls. A type argument cannot contain `(`, so "everything up to the
  // opening paren" is both simpler and exact.
  const callRe =
    /\bapi\s*\.\s*(get|post|put|patch|delete)\b[^(]*\(\s*[`'"](\/v1\/api\/[^`'"]*)[`'"]/g;
  for (const file of sourceFiles()) {
    const source = readFileSync(file, 'utf8');
    let match;
    while ((match = callRe.exec(source))) {
      const line = source.slice(0, match.index).split('\n').length;
      calls.push({ file, line, verb: match[1], path: match[2].replace(/\$\{[^}]*\}/g, '{}') });
    }
  }
  return calls;
}

/** `/v1/api/posts/{postId}/comments` and `/v1/api/posts/{}/comments` are the same route. */
const shape = (path) => path.replace(/\{[^}]*\}/g, '{}').replace(/\/$/, '');

/**
 * Endpoints this app is RIGHT not to call through its axios client, and why.
 *
 * Without this, the "never called" list is five permanent lines a reader has to re-derive on
 * every run — and a genuinely forgotten endpoint would hide among them.
 */
const NOT_OURS_TO_CALL = {
  '/v1/api/events/google/callback': 'Google redirects the browser here; the backend answers it',
  '/v1/api/knowledge/sync/pull':
    'deliberately unimplemented — see the note in knowledge/api/knowledge.ts',
  '/v1/api/knowledge/sync/push':
    'deliberately unimplemented — see the note in knowledge/api/knowledge.ts',
  '/v1/api/notifications/stream': 'SSE, read with EventSource rather than through the axios client',
  '/v1/api/payments/momo/webhook': 'MoMo calls it server-to-server',
};

const routes = schemaRoutes();
/**
 * MERGED BY SHAPE, because two routes can share one. `POST /friendships/requests/{addresseeId}`
 * and `DELETE /friendships/requests/{requestId}` are different endpoints that this app addresses
 * with the same template; keeping only the last one read the POST as unanswered.
 */
const byShape = new Map();
for (const [path, verbs] of routes) {
  const key = shape(path);
  const entry = byShape.get(key) ?? { path: key, verbs: new Set() };
  for (const verb of verbs) entry.verbs.add(verb);
  byShape.set(key, entry);
}

const problems = [];
for (const call of callSites()) {
  const route = byShape.get(shape(call.path));
  if (!route) {
    problems.push({ ...call, why: 'no such path in the OpenAPI document' });
  } else if (!route.verbs.has(call.verb)) {
    const served = [...route.verbs].join(', ') || 'nothing';
    problems.push({
      ...call,
      why: `${route.path} answers ${served}, not ${call.verb.toUpperCase()}`,
    });
  }
}

const called = new Set(callSites().map((c) => shape(c.path)));
const unused = [...routes.keys()].filter((p) => !called.has(shape(p)));

console.log(`${routes.size} routes in ${SCHEMA} · ${callSites().length} call sites in this app`);

const unexplained = unused.filter((path) => !(path in NOT_OURS_TO_CALL));
if (unexplained.length) {
  console.log(`
${unexplained.length} endpoint(s) the backend serves and this app never calls:`);
  for (const path of unexplained.sort()) console.log(`  · ${path}`);
} else if (unused.length) {
  console.log(`
Every uncalled endpoint is one of the ${unused.length} known exceptions:`);
  for (const path of unused.sort()) console.log(`  · ${path} — ${NOT_OURS_TO_CALL[path]}`);
}

if (problems.length) {
  console.error(`\n${problems.length} call(s) the backend does not answer:`);
  for (const p of problems)
    console.error(`  ✗ ${p.file}:${p.line}  ${p.verb.toUpperCase()} ${p.path}\n      ${p.why}`);
  process.exit(1);
}

console.log('\nEvery call this app makes is answered by the schema.');
