/**
 * Query keys for `features/matchmaking`.
 *
 * ONE KEY, BECAUSE THERE IS ONE READ. Four of the five endpoints are writes returning `void`, and
 * the only query is the candidate shortlist for a position. There is nothing else to cache and,
 * until the backend exposes the missing lists (B24), nothing else to invalidate.
 */
export const matchmakingKeys = {
  all: ['matchmaking'] as const,

  /** Shortlisted candidates for one position. */
  suggestedCandidates: (positionId: number) =>
    ['matchmaking', 'suggested-candidates', positionId] as const,
};
