import api from './axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type {
  PendingFriendRequestWire,
  SentFriendRequestWire,
  FriendListResponseWire,
  FriendSuggestionWire,
} from '@/lib/types';
import { MOCK_USERS } from '@/lib/mock/users';
import { decodeJwt } from '@/lib/jwt';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

function mockResponse<T>(data: T): Promise<AxiosResponse<T>> {
  return Promise.resolve({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} } as InternalAxiosRequestConfig,
  });
}

function getCurrentMockUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (!raw) return null;
    const { accessToken } = JSON.parse(raw);
    const payload = decodeJwt(accessToken);
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

export const friendshipApi = {
  sendRequest: (addresseeId: string | number) => {
    if (USE_MOCK) return mockResponse<void>(undefined);
    return api.post<void>(`/v1/api/friendships/requests/${addresseeId}`);
  },

  cancelRequest: (requestId: string | number) => {
    if (USE_MOCK) return mockResponse<void>(undefined);
    return api.delete<void>(`/v1/api/friendships/requests/${requestId}`);
  },

  acceptRequest: (requestId: string | number) => {
    if (USE_MOCK) return mockResponse<void>(undefined);
    return api.post<void>(`/v1/api/friendships/requests/${requestId}/accept`);
  },

  rejectRequest: (requestId: string | number) => {
    if (USE_MOCK) return mockResponse<void>(undefined);
    return api.post<void>(`/v1/api/friendships/requests/${requestId}/reject`);
  },

  getPendingRequests: (): Promise<AxiosResponse<PendingFriendRequestWire[]>> => {
    if (USE_MOCK) return mockResponse<PendingFriendRequestWire[]>([]);
    return api.get<PendingFriendRequestWire[]>('/v1/api/friendships/requests/pending');
  },

  getSentRequests: (): Promise<AxiosResponse<SentFriendRequestWire[]>> => {
    if (USE_MOCK) return mockResponse<SentFriendRequestWire[]>([]);
    return api.get<SentFriendRequestWire[]>('/v1/api/friendships/requests/sent');
  },

  getFriends: (cursor?: number, limit = 100): Promise<AxiosResponse<FriendListResponseWire>> => {
    if (USE_MOCK) {
      const currentId = getCurrentMockUserId();
      const friends = MOCK_USERS.filter((u) => u.id !== currentId).map((u, i) => ({
        userId: i + 1,
        username: u.email.split('@')[0],
        fullName: u.fullname,
        profilePictureUrl: u.profilePictureUrl,
      }));
      return mockResponse<FriendListResponseWire>({
        friends,
        nextCursor: null,
        hasMore: false,
        totalCount: friends.length,
      });
    }
    return api.get<FriendListResponseWire>('/v1/api/friendships', { params: { cursor, limit } });
  },

  getSuggestions: (limit = 10): Promise<AxiosResponse<FriendSuggestionWire[]>> => {
    if (USE_MOCK) return mockResponse<FriendSuggestionWire[]>([]);
    return api.get<FriendSuggestionWire[]>('/v1/api/friendships/suggestions', {
      params: { limit },
    });
  },
};
