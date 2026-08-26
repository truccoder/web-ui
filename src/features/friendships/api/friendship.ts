import api from '@/core/api/axios';
import type {
  FriendListResponse,
  FriendRequestPage,
  FriendSuggestion,
  PendingFriendRequest,
  SentFriendRequest,
} from '../types/friendship';

/**
 * FriendshipController (`com.socialapp.friendships`) — 8 endpoints, one function each.
 * Bare-DTO responses (no wrapper). Ids are the backend's `Integer` primary keys:
 * `addresseeId` is a user id, `requestId` a friendship-request id.
 */
export const friendshipApi = {
  /** GET /v1/api/friendships — cursor-paginated friends list. */
  // The endpoint's own cap — `limit` is `maximum: 50` and 100 answers 400. See `PREVIEW_LIMIT`.
  getFriends: (cursor?: number, limit = 50) =>
    api
      .get<FriendListResponse>('/v1/api/friendships', { params: { cursor, limit } })
      .then((r) => r.data),

  /**
   * GET /v1/api/friendships/requests/pending — incoming requests, ONE PAGE.
   *
   * `limit = 50` IS THE ENDPOINT'S CEILING, asked for deliberately. Everything that reads this
   * either lists the requests or counts them for a badge, and both want the whole set; 20 (the
   * server default) would silently cap a badge that is supposed to say how many people are
   * waiting. The page's `hasMore` is what tells a caller the ceiling was hit — see the hooks,
   * which are the ones that would have to grow a cursor if it ever fires.
   */
  getPendingRequests: (cursor?: number, limit = 50) =>
    api
      .get<FriendRequestPage<PendingFriendRequest>>('/v1/api/friendships/requests/pending', {
        params: { cursor, limit },
      })
      .then((r) => r.data),

  /** GET /v1/api/friendships/requests/sent — outgoing requests, one page. Same ceiling, same
   * reason: the screen lists them all. */
  getSentRequests: (cursor?: number, limit = 50) =>
    api
      .get<FriendRequestPage<SentFriendRequest>>('/v1/api/friendships/requests/sent', {
        params: { cursor, limit },
      })
      .then((r) => r.data),

  /** GET /v1/api/friendships/suggestions — people you may know. */
  getSuggestions: (limit = 10) =>
    api
      .get<FriendSuggestion[]>('/v1/api/friendships/suggestions', { params: { limit } })
      .then((r) => r.data),

  /** POST /v1/api/friendships/requests/{addresseeId} — send a request to a user. */
  sendRequest: (addresseeId: number) =>
    api.post<void>(`/v1/api/friendships/requests/${addresseeId}`).then((r) => r.data),

  /** DELETE /v1/api/friendships/requests/{requestId} — cancel a request you sent. */
  cancelRequest: (requestId: number) =>
    api.delete<void>(`/v1/api/friendships/requests/${requestId}`).then((r) => r.data),

  /** POST /v1/api/friendships/requests/{requestId}/accept — accept an incoming request. */
  acceptRequest: (requestId: number) =>
    api.post<void>(`/v1/api/friendships/requests/${requestId}/accept`).then((r) => r.data),

  /** POST /v1/api/friendships/requests/{requestId}/reject — reject an incoming request. */
  rejectRequest: (requestId: number) =>
    api.post<void>(`/v1/api/friendships/requests/${requestId}/reject`).then((r) => r.data),

  /**
   * DELETE /v1/api/friendships/{userId} — end an existing friendship.
   *
   * KEYED BY THE OTHER PERSON, NOT BY A REQUEST ID, and the backend's own note says why: what is
   * being deleted is the friendship, which is identified by who it is with — not by the request row
   * that once created it. That row is deleted too (`deleteAcceptedBetween`), so unfriending and
   * re-adding starts genuinely fresh rather than reviving an old ACCEPTED row.
   *
   * IDEMPOTENT: **204 even when the two were never friends**, by design rather than by accident.
   * So a success here does not prove a friendship existed, and the UI must not report "removed" as
   * if it had verified something — it reports that the state is now "not friends", which is true
   * either way. There is no 404 to handle.
   *
   * 400 IS THE ONE REAL ERROR: `unfriend(self, self)` throws "You cannot unfriend yourself". No
   * surface should be able to produce it, since you are never in your own friends list, but it is
   * the only failure mode worth showing verbatim if one ever does.
   *
   * IT CLOSES A CEILING THE FINDINGS RECORDED as "no endpoint to unfriend" — measured on the live
   * spec 2026-08-09, in the same backend batch as public profiles and appeals.
   */
  unfriend: (userId: number) =>
    api.delete<void>(`/v1/api/friendships/${userId}`).then((r) => r.data),
};
