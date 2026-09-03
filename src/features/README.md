# `src/features/` — one folder per backend domain

Each `features/<domain>/` mirrors a backend package 1:1
(`com.socialapp.chat` → `features/chat/`) and is self-contained:

```
features/<domain>/
  types/            derived from core/api/schema.gen.ts — never retyped by hand
  api/              one function per backend endpoint
  hooks/ | store/   React Query over the api layer; Redux only for real global client state
  components/       composed from shared/ only
  index.ts          the single public surface
```

## The extraction test

A feature is done when you could copy its folder into an empty repo and the only
unresolved imports would be `core/`, `shared/`, and other features' `index.ts`.

Consequences, all mandatory:

- **No cross-domain buckets.** A file holding several domains' types fails the test by
  construction. Types live in the one feature that owns them.
- **No reaching into another feature.** Import `@/features/posts`, never
  `@/features/posts/api/posts`. The barrel is the contract.
- A type two features need belongs to its owner and is re-exported from that owner's
  `index.ts`. Do not promote it to `shared/` — see `src/shared/README.md`.

## Checkpoint splits do not split the module

A domain built across several checkpoints is still **one** folder with **one**
`index.ts`. `posts` covers Post, Comment, Reaction, Location, Quiz _and_ Event because
`EventController` lives in the backend's `posts` package — the module mirrors the
package, not the schedule. Do not create `features/events/` or `features/auth/`.

Counter-intuitive placements are recorded in the `boundary note` column of
`docs/fe-migration-ledger.md` so a later reader does not "fix" a deliberate choice.
