import type { ModerationSearchParams } from '../types/moderation';

/**
 * Query keys for `features/moderation`, all under one namespace.
 *
 * THE FILTERS ARE IN THE KEY because the server applies them: each combination is a different
 * response, and a shared key would let the last filter fetched overwrite the cache for every
 * other one. Same reasoning as `postKeys.attendees`.
 *
 * `all` is the prefix a review invalidates. A decision moves the post between statuses, appends a
 * history row, and — when it rejects — can add the author to the banned list, so all three
 * branches are stale at once and none of them can be patched from a `void` response.
 */
export const moderationKeys = {
  all: ['moderation'] as const,

  posts: (params: ModerationSearchParams) => ['moderation', 'posts', params] as const,
  logs: (params: ModerationSearchParams) => ['moderation', 'logs', params] as const,
  bannedUsers: (page: number, size: number) => ['moderation', 'banned-users', page, size] as const,
};
