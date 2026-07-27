import type { LocationResolutionRequest } from '../types/location';

/**
 * Query keys for `features/posts`, all under one namespace.
 *
 * `comments` is declared here in cycle 1 even though the query itself arrives in cycle 2:
 * `acceptAnswer` (a cycle-1 endpoint, see `postsApi`) changes the accepted answer on a
 * thread, so it has to invalidate that thread. Same module, one barrel — the checkpoint
 * split is a schedule, not a boundary.
 *
 * Cycle 2's comment query reuses that same `comments` key rather than declaring its own —
 * a second key would compile fine and silently strand `useAcceptAnswer`'s invalidation on
 * a cache entry nobody reads.
 */
export const postKeys = {
  all: ['posts'] as const,
  post: (postId: number) => ['posts', postId] as const,
  comments: (postId: number) => ['posts', postId, 'comments'] as const,
  /**
   * The current user's own reaction on one post. Scoped under the post id (so it is swept
   * by `post(postId)`) and suffixed `me` because that is all the endpoint answers — there
   * is no endpoint for a post's reaction totals or reactor list, so no key for them either.
   */
  myReaction: (postId: number) => ['posts', postId, 'reaction', 'me'] as const,
  locationSearch: (request: LocationResolutionRequest) => ['posts', 'locations', request] as const,

  /**
   * EventController's reads, cycle 3. Under the same `posts` namespace and — for the two
   * per-event ones — under `post(postId)`, because an event *is* a post: every event
   * endpoint loads the post first and rejects it unless its type is EVENT. Keying them
   * anywhere else would let a post-level invalidation miss the event state hanging off the
   * same id.
   */

  /** Every RSVP row for one event, whatever the status. */
  attendees: (postId: number) => ['posts', postId, 'attendees'] as const,
  /**
   * The GOING count. A key of its own rather than something derived from `attendees`,
   * because it is a separate endpoint answering a narrower question — and it is the number
   * the backend itself checks against `maxAttendees`, so it must be able to be refetched on
   * its own.
   */
  attendeeCount: (postId: number) => ['posts', postId, 'attendees', 'count'] as const,

  /**
   * Google Calendar link state. Per-user, not per-post, so these sit beside the posts rather
   * than under an id — several event cards on one screen share one cache entry and therefore
   * one request.
   */
  calendarStatus: () => ['posts', 'google-calendar', 'status'] as const,
  googleAuthUrl: () => ['posts', 'google-calendar', 'auth-url'] as const,
};
