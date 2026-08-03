/**
 * Query keys for `features/github`, all under one namespace.
 *
 * ONE BRANCH ONLY. Four of the five endpoints are writes and the fifth is the stats read, so
 * there is nothing here to invalidate independently — every mutation in this domain ends up
 * changing the same stored row. `all` is what they invalidate; `stats(userId)` is the only key
 * anything actually reads under.
 */
export const githubKeys = {
  all: ['github'] as const,

  /** One user's stored stats. Keyed by id because the endpoint takes one. */
  stats: (userId: number) => ['github', 'stats', userId] as const,
};
