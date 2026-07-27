import api from '@/core/api/axios';
import type { AxiosResponse } from 'axios';
import type {
  PendingFriendRequestWire,
  FriendListResponseWire,
  FriendSuggestionWire,
} from '@/lib/types';

// LEGACY, shrinking — see the note in `lib/hooks/use-friendship.ts`. `features/friendships`
// owns this domain; only the calls that dashboard / chats / shell still reach for survive
// here. The `NEXT_PUBLIC_USE_MOCK` branches went with `src/lib/mock/` (CLAUDE.md §2: mock
// code is deleted, not migrated) — this file was its last consumer.
export const friendshipApi = {
  sendRequest: (addresseeId: string | number) =>
    api.post<void>(`/v1/api/friendships/requests/${addresseeId}`),

  acceptRequest: (requestId: string | number) =>
    api.post<void>(`/v1/api/friendships/requests/${requestId}/accept`),

  rejectRequest: (requestId: string | number) =>
    api.post<void>(`/v1/api/friendships/requests/${requestId}/reject`),

  getPendingRequests: (): Promise<AxiosResponse<PendingFriendRequestWire[]>> =>
    api.get<PendingFriendRequestWire[]>('/v1/api/friendships/requests/pending'),

  getFriends: (cursor?: number, limit = 100): Promise<AxiosResponse<FriendListResponseWire>> =>
    api.get<FriendListResponseWire>('/v1/api/friendships', { params: { cursor, limit } }),

  getSuggestions: (limit = 10): Promise<AxiosResponse<FriendSuggestionWire[]>> =>
    api.get<FriendSuggestionWire[]>('/v1/api/friendships/suggestions', { params: { limit } }),
};
