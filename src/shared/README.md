# `src/shared/` — domain-agnostic building blocks

Presentational primitives and pure utilities that **name no domain concept**. `Button`,
`Input`, `Dialog`, `formatRelativeTime` belong here; `PostCard`, `BookCover`, and
`FriendRequestRow` do not — those live in the feature that owns them.

## The rule that keeps this folder from rotting

A type needed by two features belongs to whichever feature **owns** it, re-exported
through that feature's `index.ts`. Do not lift it here to dodge the dependency: that
hides a real coupling, and `shared/` quietly becomes the next global bucket — exactly the
shape `src/lib/` is being dismantled for.

Test before adding a file: _could this be published as a standalone package that knows
nothing about this product?_ If not, it is not shared.

## `components/`

Hand-written TypeScript, built **on demand** — a primitive is created when the first real
caller needs it, never speculatively. A component invented ahead of any consumer is
almost always the wrong shape, and correcting it costs more than writing it late.

Every primitive covers: hover · focus-visible · disabled · loading · dark mode, and climbs
the design system's state ladder (rest → hover 4% → pressed 8% → selected → focus ring).

These replace `src/components/ui/*` (shadcn) one at a time as domains are rebuilt.
