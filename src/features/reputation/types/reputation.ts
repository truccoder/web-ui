import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];
type RawReputation = Schemas['ReputationResponseDto'];

/**
 * Elite Score for one user (`GET /v1/api/users/{userId}/reputation`), derived from
 * `schema.gen.ts`.
 *
 * Nullability confirmed against `reputation/dto/ReputationResponseDto.java` +
 * `ReputationService.getReputation`:
 * - `level` and `verifiedExpert` are Java primitives → always present.
 * - `eliteScore` is `Integer` but is always filled from `user.getEliteScore()` (an `int`).
 * - `levelName` always comes from the `RepLevel` enum → always present.
 * - `nextLevelMin` is **null once the user reaches ELITE** (`RepLevel.next()` returns null),
 *   so it stays optional. That null is the "no next level" signal — the UI must handle it
 *   rather than treat it as zero.
 *
 * THREE-WAY SYNC (CLAUDE.md §1): the level thresholds live in the backend enum `RepLevel`
 * and in the design system's `REP_LEVELS`. They are deliberately **not** written a third
 * time here — `levelName` and `nextLevelMin` come off this response.
 */
export type Reputation = Required<Omit<RawReputation, 'nextLevelMin'>> & {
  nextLevelMin?: number;
};
