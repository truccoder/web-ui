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
