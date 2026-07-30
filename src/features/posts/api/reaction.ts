import api from '@/core/api/axios';
import type { MyReaction, UpsertReactionRequest } from '../types/reaction';

/**
 * PostReactionController (`com.socialapp.posts`) — 3 endpoints, one function each. Bare
 * responses, no wrapper.
 *
 * Note what is NOT here: there is no endpoint to read a post's reaction totals or the list
 * of who reacted. `getMyReaction` answers "did *I* react", nothing more; the aggregate
 * counts come embedded in the newsfeed/search post payload. A UI that wants the count to
 * move after clicking has to either patch that feed entry itself or refetch the feed —
 * this controller will never tell it the new total.
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
};
