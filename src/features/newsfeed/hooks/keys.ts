/**
 * Query keys for `features/newsfeed`.
 *
 * One key for one endpoint, but it is the most invalidated key in the app: every write in
 * `features/posts` (create, edit, delete, react, comment, RSVP) changes what the feed should
 * say, and none of those hooks may invalidate it themselves — posts must not know another
 * domain's cache layout (CLAUDE.md §4). They take an `onSuccess` instead, and the screens
 * that compose them point it here.
 *
 * This constant replaces the flat `['newsfeed']` literal that the legacy `lib/hooks/use-posts.ts`
 * exported as `NEWSFEED_QUERY_KEY` while this module did not exist yet (the seam set up at
 * P2.4d, closed at P2.5).
 */
export const newsfeedKeys = {
  all: ['newsfeed'] as const,
  feed: () => ['newsfeed', 'feed'] as const,

  /**
   * The `Tất cả` tab. A SEPARATE BRANCH FROM `feed`, not a parameter on it: the two read
   * different endpoints with different pagination, and a write that changes one changes the
   * other, so `useRefreshFeed` sweeps the shared `all` prefix rather than either leaf.
   */
  publicFeed: () => ['newsfeed', 'public'] as const,
};
