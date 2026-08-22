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
  appeals: (status: string, page: number, size: number) =>
    ['moderation', 'appeals', status, page, size] as const,
  // `postId` is in the key for the reason at the top of this file — it is a server-applied
  // filter, so the unfiltered list and a single post's reports are different responses.
  reports: (postId: number | undefined, page: number, size: number) =>
    ['moderation', 'reports', postId ?? null, page, size] as const,

  // The user side. Separate from `all` on purpose: an admin decision invalidates the queue, and a
  // user appealing invalidates only their own two lists — sharing a prefix would make every
  // moderator action refetch every reader's violations.
  mine: ['moderation', 'mine'] as const,
  myViolations: ['moderation', 'mine', 'violations'] as const,
  myAppeals: ['moderation', 'mine', 'appeals'] as const,
};
