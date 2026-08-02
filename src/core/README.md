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
refactor across 15 features and ~1,700 keys, with no behavioural payoff, and it was not what the
shell checkpoint was for. Splitting it now would also break the one property the current design
has: `Messages` is derived from `en.ts`, so `vi.ts` fails to compile the moment a key is missing —
a per-feature split has to reproduce that or lose it.

Reported at Phase 4 (Constraint #2: anything that fits none of the four homes is a finding, not
something parked back in `lib/`), with the split as the recommendation.
