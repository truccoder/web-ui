# `src/core/` — infrastructure

Cross-cutting plumbing with **no domain knowledge**. If a file here mentions a post, a
book, or a friendship, it is in the wrong folder.

What belongs here:

- the axios instance (incl. the refresh-token dedupe — move it, do not rewrite it)
- the React Query client
- Redux store setup
- app-level providers
- `api/schema.gen.ts` — generated from the backend OpenAPI spec

What does not:

- anything a single domain owns → `src/features/<domain>/`
- presentational primitives with no domain meaning → `src/shared/`

## `api/schema.gen.ts`

Generated, tracked in git, **never hand-edited**:

```bash
npx openapi-typescript@7 http://localhost:8080/v3/api-docs -o src/core/api/schema.gen.ts
```

Its diff is the drift alarm: a backend contract change shows up as a `tsc` failure in the
features that derive from it, instead of a 404 at runtime. Regenerate before starting each
domain and check `git diff` on it.

## `i18n/` — moved here at P3.4d

The provider, `useT`/`useI18n`, and the two message bundles. It lived in `src/lib/i18n` until the
shell rebuild; moving it is what made `src/lib/` disappear (CLAUDE.md Constraint #2 requires that
by Phase 4).

**IT IS A KNOWN EXCEPTION TO THE RULE AT THE TOP OF THIS FILE, recorded rather than hidden.** The
_machinery_ is textbook infrastructure — a context provider, a path resolver, a `${}` interpolator,
none of which knows a post from a book. The _bundles_ do: `en.ts` and `vi.ts` carry strings for
every domain in the app, so by the letter of "if a file here mentions a post, a book, or a
friendship, it is in the wrong folder", they are.

The strictly correct shape is per-feature message bundles merged at the provider. That is a real
refactor across 16 features and ~1,700 keys, with no behavioural payoff, and it was not what the
shell checkpoint was for. Splitting it now would also break the one property the current design
has: `Messages` is derived from `en.ts`, so `vi.ts` fails to compile the moment a key is missing —
a per-feature split has to reproduce that or lose it.

Reported at Phase 4 (Constraint #2: anything that fits none of the four homes is a finding, not
something parked back in `lib/`), with the split as the recommendation.

### Decided: the bundles stay here. This is the settled answer, not an open finding.

Re-examined at the P2 cleanup and closed the other way, deliberately, so that nobody re-opens it
from the paragraph above and starts a refactor the project does not want.

**What the split would buy: extraction-test purity, and nothing else.** No key resolves faster, no
bundle ships smaller — the provider needs every domain's strings on every route regardless of
which file they were written in, so a merged-at-runtime bundle is the same bytes through a longer
pipe.

**What it would cost is a real property, not a stylistic one.** `Messages` is `typeof en`, so
`vi.ts` is type-checked against it key for key: a missing Vietnamese string is a `tsc` failure
before it is ever a blank label on screen. That guarantee is worth more than the boundary it
violates, and reproducing it across 16 merged bundles means either a hand-maintained union type
or a build step — machinery in exchange for tidiness.

**And the violation is narrow and legible.** One folder, two files, no logic: the machinery here
genuinely knows nothing about any domain, and the bundles are data. `features/*/index.ts` stays
the contract for everything else, and the extraction test still passes for every feature — a
feature copied into an empty repo needs `core/i18n` for `useT`, which is the same import it would
need for its own bundle anyway.

**When to re-open it.** If a second app ever shares these features, or if the bundles grow past
the point where one file is editable, the split becomes worth its cost. Neither is true at ~2,600
lines across two files.
