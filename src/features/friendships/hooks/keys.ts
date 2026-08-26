/**
 * Query keys for `features/friendships`, all under one namespace. `friends` and
 * `friendsInfinite` share the `['friendships', 'friends']` prefix on purpose, so a single
 * prefix invalidation refreshes both the one-shot batch and the paginated list.
 */
export const friendshipKeys = {
  all: ['friendships'] as const,
  friends: (limit: number) => ['friendships', 'friends', limit] as const,
  friendsInfinite: (limit: number) => ['friendships', 'friends', 'infinite', limit] as const,
  friendsRoot: ['friendships', 'friends'] as const,
  suggestions: (limit: number) => ['friendships', 'suggestions', limit] as const,
  suggestionsRoot: ['friendships', 'suggestions'] as const,
  pending: ['friendships', 'pending'] as const,
  sent: ['friendships', 'sent'] as const,
};
