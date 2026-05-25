import api from './axios';
import type {
  SendFriendRequestPayload,
  PendingFriendRequest,
  SentFriendRequest,
  Profile,
} from '@/lib/types';

export const friendshipApi = {
  sendRequest: (data: SendFriendRequestPayload) =>
    api.post<void>('/v1/api/friendships/requests', data),

  acceptRequest: (requestId: string) =>
    api.post<void>(`/v1/api/friendships/requests/${requestId}/accept`),

  rejectRequest: (requestId: string) =>
    api.post<void>(`/v1/api/friendships/requests/${requestId}/reject`),

  cancelRequest: (requestId: string) =>
    api.post<void>(`/v1/api/friendships/requests/${requestId}/cancel`),

  getPendingRequests: () => api.get<PendingFriendRequest[]>('/v1/api/friendships/requests/pending'),

  getSentRequests: () => api.get<SentFriendRequest[]>('/v1/api/friendships/requests/sent'),

  getFriends: () => api.get<Profile[]>('/v1/api/friendships/friends'),

  getSuggestions: () => api.get<Profile[]>('/v1/api/friendships/suggestions'),
};
