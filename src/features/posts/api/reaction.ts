import api from '@/core/api/axios';
import type {
  MyReaction,
  ReactionType,
  ReactorPage,
  UpsertReactionRequest,
} from '../types/reaction';

/**
 * PostReactionController (`com.socialapp.posts`) — 3 endpoints, one function each. Bare
 * responses, no wrapper.
 *
 * THE NOTE THAT USED TO END THIS PARAGRAPH IS OBSOLETE, and it is quoted because it shaped how
 * the feed handles counts: "there is no endpoint to read a post's reaction totals or the list of
 * who reacted … this controller will never tell it the new total."
 *
 * Both exist now — `/summary` for the totals and the collection root for the reactors. What has
 * NOT changed is where the feed card's counts come from: they are still embedded in the
 * newsfeed/search payload, and a UI that wants a count to move after a click still refetches the
 * feed. Calling `/summary` per card would be one request per post to re-derive a number the list
 * response already carried.
 */
export const reactionsApi = {
  /**
   * GET /v1/api/posts/{postId}/reactions/me — the current user's reaction on one post,
   * `{ reactionType: null }` when there is none (200, not 404).
   *
   * One call per post: there is no batch variant, so a feed of N cards is N requests unless
   * the state layer decides otherwise.
   */
  getMyReaction: (postId: number) =>
    api.get<MyReaction>(`/v1/api/posts/${postId}/reactions/me`).then((r) => r.data),

  /**
   * PUT /v1/api/posts/{postId}/reactions — set or change the reaction. Idempotent upsert on
   * the (user, post) pair, so changing LIKE → LOVE is this call alone.
   *
   * Reputation is only awarded on the FIRST reaction (`isNewReaction`), so re-picking a
   * different emoji does not re-award the author; removing and re-adding does.
   */
  upsertReaction: (postId: number, payload: UpsertReactionRequest) =>
    api.put<void>(`/v1/api/posts/${postId}/reactions`, payload).then((r) => r.data),

  /**
   * DELETE /v1/api/posts/{postId}/reactions — un-react.
   *
   * **400/404 on a post the user has not reacted to**: `removeReaction` throws
   * `NotFoundException("Reaction not found for this post")` rather than treating it as a
   * no-op. A toggle built on this must know its current state before firing, and an
   * optimistic UI has to be able to roll back.
   */
  removeReaction: (postId: number) =>
    api.delete<void>(`/v1/api/posts/${postId}/reactions`).then((r) => r.data),

  /**
   * GET /v1/api/posts/{postId}/reactions/summary — a count per reaction type.
   *
   * A BARE `Map<ReactionType, Long>`, so the response is an object keyed by the enum name and a
   * type with no reactions is simply absent rather than present with `0`. Anything reading it must
   * default a missing key rather than assume every type appears.
   */
  getSummary: (postId: number) =>
    api
      .get<Partial<Record<ReactionType, number>>>(`/v1/api/posts/${postId}/reactions/summary`)
      .then((r) => r.data),

  /**
   * GET /v1/api/posts/{postId}/reactions — who reacted, cursor-paged.
   *
   * `type` NARROWS IT TO ONE REACTION; omitted, it returns every reactor. That is the parameter
   * that makes a per-type tab possible without a second endpoint.
   *
   * MAPPED ON THE COLLECTION ROOT, next to the PUT that writes the caller's own reaction — the
   * verb, not the path, is what separates reading the list from setting your own entry. A reader
   * of this file should not "tidy" either into a sub-path.
   */
  getReactors: (postId: number, type?: ReactionType, cursor?: number, limit = 20) =>
    api
      .get<ReactorPage>(`/v1/api/posts/${postId}/reactions`, { params: { type, cursor, limit } })
      .then((r) => r.data),
};
