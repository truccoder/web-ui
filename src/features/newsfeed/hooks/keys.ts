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
  feed: (scope: string = 'ALL') => ['newsfeed', 'feed', scope] as const,

  /**
   * The `Bài viết` tab. A SEPARATE BRANCH FROM `feed`, not a parameter on it: the two read
   * different endpoints with different pagination, and a write that changes one changes the
   * other, so `useRefreshFeed` sweeps the shared `newsfeed` prefix rather than either leaf.
   *
   * `hashtag` IS PART OF THE KEY (B31): the filtered feed and the whole feed are different lists
   * with different pages, so browsing `#kafka` and then clearing the filter is a cache hit both
   * ways rather than a refetch. Absent collapses to the bare key so the unfiltered tab is
   * untouched.
   */
  publicFeed: (hashtag?: string | null) =>
    hashtag
      ? (['newsfeed', 'public', 'hashtag', hashtag] as const)
      : (['newsfeed', 'public'] as const),

  /**
   * One author's posts. Under the same `newsfeed` prefix so `useRefreshFeed` sweeps it too — a
   * post created or deleted changes this list exactly as it changes the other two.
   */
  userPosts: (userId: number) => ['newsfeed', 'user-posts', userId] as const,

  /** One post, for the permalink page. Same prefix, so a create or delete sweeps it too. */
  post: (postId: number) => ['newsfeed', 'post', postId] as const,

  /**
   * The moderation-clearance probe for one just-created post — see `usePostApproval`. Under the
   * `newsfeed` prefix on purpose: the probe reads the author's own fan-out feed, so a
   * `useRefreshFeed` sweep after a create should refresh it too.
   */
  approvalProbe: (postId: number) => ['newsfeed', 'approval-probe', postId] as const,
};
