import api from '@/core/api/axios';
import type {
  FriendListResponse,
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
  getFriends: (cursor?: number, limit = 100) =>
    api
      .get<FriendListResponse>('/v1/api/friendships', { params: { cursor, limit } })
      .then((r) => r.data),

  /** GET /v1/api/friendships/requests/pending — incoming requests. */
  getPendingRequests: () =>
    api.get<PendingFriendRequest[]>('/v1/api/friendships/requests/pending').then((r) => r.data),

  /** GET /v1/api/friendships/requests/sent — outgoing requests. */
  getSentRequests: () =>
    api.get<SentFriendRequest[]>('/v1/api/friendships/requests/sent').then((r) => r.data),

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
};
