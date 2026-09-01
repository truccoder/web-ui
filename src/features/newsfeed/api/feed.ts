import api from '@/core/api/axios';
import type {
  FeedPage,
  FeedPost,
  FeedRebuildResult,
  MarkSeenInput,
  PublicFeedPage,
  FeedApiScope,
} from '../types/feed';

/**
 * NewsfeedController (`com.socialapp.newsfeed`) — 2 endpoints (`GET /feed`, `POST /feed/seen`).
 * Bare responses, no wrapper.
 *
 * A FURTHER ENDPOINT LIVES HERE THAT THE PACKAGE MIRROR WOULD PUT IN `features/posts`, and the
 * exception is deliberate. `GET /v1/api/posts/public` (`getPublicFeed`, added 2026-08-09) is
 * served by `PostController`, so CLAUDE.md §4's 1:1 package mirror points at `features/posts`.
 * It is here instead, because putting it there would create the project's FIRST DEPENDENCY CYCLE:
 * the endpoint returns `FeedPostDataDto`, which this feature owns and models as `FeedPost`, so
 * `posts` would have to import it back from `newsfeed` — and `newsfeed` already imports `posts`
 * (`feed-post.tsx` renders `PostCard`). P3.5 verified the graph is acyclic; a mirror rule is not
 * worth being the thing that breaks it.
 *
 * The tie-breaker beyond the cycle: the endpoint IS a feed read. Its operationId is
 * `getPublicFeed`, it returns the same item type as `/feed`, and the design system calls it the
 * feed's `Bài viết` tab. Recorded as a boundary note in the ledger, in the opposite direction from
 * the usual ones (those record a controller sitting in a surprising package; this records us
 * declining to follow one).
 */
export const newsfeedApi = {
  /**
   * GET /v1/api/feed — one page of the signed-in user's feed.
   *
   * `page` is 1-based (`@Positive`, and the service computes `start = (page - 1) * size`);
   * passing 0 is a 400, not the first page.
   *
   * SERVED ENTIRELY FROM REDIS, WITH NO DATABASE FALLBACK. `getFeed` reads a sorted set and
   * returns an empty page when it is missing, so a post that exists in Postgres but was never
   * fanned out is invisible here, and a post deleted straight from Postgres keeps appearing
   * until the cache entry goes. Two consequences worth carrying into any debugging: the feed
   * is not a query over posts, and "it is not in the feed" never proves "it was not saved".
   */
  /**
   * `scope` narrows the SAME fan-out feed, it does not switch endpoints: `ALL` is everything
   * Redis holds for this user, `SKILLS` keeps only the posts touching a skill they have verified.
   * Both still come from the precomputed set, so neither can contain a stranger's post.
   *
   * HOW `SKILLS` FILTERS, and the two gotchas it carries (`NewsfeedService.getSkillFeed`). The
   * user's VERIFIED skill-node names are folded to hashtag candidates (accents stripped, letters
   * and digits only, fragments <3 chars dropped) and intersected with real `t_hashtags` rows; the
   * backend then scans AT MOST the 300 newest posts in this user's Redis feed and keeps any whose
   * hashtags touch one of those tags (any-match). So: (1) a profile with no verified skill that
   * resolves to a live hashtag gets an EMPTY tab with no fallback to the plain feed, and (2)
   * `hasMore` is only honest within that 300-post window — paging can stop early on a feed longer
   * than 300.
   */
  getFeed: (page = 1, size = 10, scope: FeedApiScope = 'ALL') =>
    api.get<FeedPage>('/v1/api/feed', { params: { page, size, scope } }).then((r) => r.data),

  /**
   * POST /v1/api/feed/seen — report the cards the reader has scrolled past, so `getFeed` stops
   * floating them back to the top. **204**, and a beacon rather than a step in a flow.
   *
   * NOTHING AWAITS THIS. The backend swallows its own Redis failures (`SeenPostTracker` is kept
   * out of the readiness group precisely so losing it costs a feature, not the service) and sends
   * no body back; a caller that blocked on it would be waiting on a fire-and-forget. `useSeenReporter`
   * calls it and drops the promise.
   *
   * ONLY MEANINGFUL FOR THE FAN-OUT FEED. It reorders `GET /feed`; `GET /posts/public` is an
   * id-ordered scan with no per-user ranking, so the `Bài viết` tab never calls this.
   *
   * AT MOST 200 IDS PER CALL (`MarkSeenRequestDto` `@Size(max = 200)`) — over the cap the whole
   * request is a 422, so the hook chunks rather than trusting the batch to stay small. The ids are
   * not validated against the posts table on purpose: the seen-set key is the caller's own.
   */
  markSeen: (postIds: number[]) =>
    api.post<void>('/v1/api/feed/seen', { postIds } satisfies MarkSeenInput).then((r) => r.data),

  /**
   * GET /v1/api/posts/public — every post in the product, newest first. The `Bài viết` tab.
   *
   * IT IS NOT `/feed` WITH A WIDER NET, and the difference is what makes two tabs worth having.
   * `/feed` is a personalised fan-out precomputed per user in Redis, so it can only ever contain
   * posts by people you are connected to. This one is a query over the posts table with no
   * personalisation of any kind — every author, no edge required. Crawled items are NOT in it:
   * they live only on the `Công nghệ` tab now.
   *
   * CURSOR-PAGINATED, NOT PAGE-PAGINATED, unlike `/feed`. The two endpoints disagree about
   * pagination because they disagree about what they are reading: a Redis range has a stable
   * index, a table ordered by id does not, and offset paging over a table that is being written
   * to shows the reader the same post twice. `nextCursor` is the last id of the page, and `null`
   * once `hasMore` is false.
   *
   * `hashtag` NARROWS THE SAME QUERY, it does not switch endpoints (B31). When set, the backend
   * adds one `EXISTS` predicate on `t_post_hashtags` — the cursor and page shape are unchanged, so
   * a tag feed is this feed with a filter, not a second thing to keep in step. The value must be
   * folded the way the backend stored it (`normalizeHashtag`); axios drops it when `undefined`, so
   * the unfiltered call is unchanged.
   */
  getPublicFeed: (cursor?: number, limit = 10, hashtag?: string) =>
    api
      .get<PublicFeedPage>('/v1/api/posts/public', { params: { cursor, limit, hashtag } })
      .then((r) => r.data),

  /**
   * GET /v1/api/users/{userId}/posts — one person's posts.
   *
   * IT LIVES HERE FOR THE SAME REASON `getPublicFeed` DOES: it returns `PostPageResponseDto`, the
   * identical page shape and the identical item type as the two feeds, so a third copy of that
   * type in `features/posts` would be the drift waiting to happen. The backend files the endpoint
   * under `/users/{id}/…` because the subject is the user; the payload is still a feed page.
   *
   * WHAT COMES BACK DEPENDS ON WHO IS ASKING, and a screen must not describe it as "their posts".
   * A stranger sees PUBLIC only, a friend also sees FRIENDS, and the author additionally sees
   * PRIVATE and anything still in — or rejected by — moderation. So the same profile shows a
   * different number of posts to different readers, by design, and no count derived from it is a
   * total.
   */
  getUserPosts: (userId: number, cursor?: number, limit = 10) =>
    api
      .get<PublicFeedPage>(`/v1/api/users/${userId}/posts`, { params: { cursor, limit } })
      .then((r) => r.data),

  /**
   * GET /v1/api/posts/{postId} — one post.
   *
   * IT RETURNS `FeedPostDataDto`, THE SAME ITEM THE FEEDS RETURN, which is the whole reason the
   * permalink page can render the identical card instead of a second, subtly different one.
   *
   * IT LIVES IN THIS FEATURE FOR THE SAME REASON THE OTHER THREE DO — the type it answers with is
   * `features/newsfeed`'s. Putting it in `features/posts` (which owns the writes) would point
   * posts → newsfeed and create this project's first dependency cycle; the same call this file
   * already documents for `getPublicFeed`.
   *
   * OPEN TO GUESTS, and visibility is applied server-side from the JWT — a post you may not see
   * answers 404 rather than 403, so the page cannot distinguish "deleted" from "not yours to
   * read" and must not claim either.
   */
  getPost: (postId: number) => api.get<FeedPost>(`/v1/api/posts/${postId}`).then((r) => r.data),

  /**
   * POST /v1/api/admin/newsfeed/rebuild — recompute every user's fan-out feed from scratch
   * (ROLE_ADMIN, enforced server-side by `SecurityConfig`'s `/v1/api/admin/**` rule).
   *
   * SLOW AND ADMIN-ONLY, and it lives here for the same reason `getUserPosts` does — it is a feed
   * operation, and putting it in an `admin` feature would fragment the one module that owns the
   * feed. Returns `{ processed, skipped }`.
   */
  rebuildFeed: () =>
    api.post<FeedRebuildResult>('/v1/api/admin/newsfeed/rebuild').then((r) => r.data),
};
