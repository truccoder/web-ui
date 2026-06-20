import api from './axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type {
  PendingFriendRequest,
  SentFriendRequest,
  Profile,
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

  getPendingRequests: (): Promise<AxiosResponse<PendingFriendRequest[]>> => {
    if (USE_MOCK) return mockResponse<PendingFriendRequest[]>([]);
    return api.get<PendingFriendRequest[]>('/v1/api/friendships/requests/pending');
  },

  getSentRequests: (): Promise<AxiosResponse<SentFriendRequest[]>> => {
    if (USE_MOCK) return mockResponse<SentFriendRequest[]>([]);
    return api.get<SentFriendRequest[]>('/v1/api/friendships/requests/sent');
  },

  getFriends: (): Promise<AxiosResponse<Profile[]>> => {
    if (USE_MOCK) {
      const currentId = getCurrentMockUserId();
      const friends = MOCK_USERS.filter((u) => u.id !== currentId).map((u) => ({
        id: u.id,
        fullname: u.fullname,
        profilePictureUrl: u.profilePictureUrl,
      }));
      return mockResponse<Profile[]>(friends);
    }
    return api.get<Profile[]>('/v1/api/friendships/friends');
  },

  getSuggestions: (): Promise<AxiosResponse<Profile[]>> => {
    if (USE_MOCK) return mockResponse<Profile[]>([]);
    return api.get<Profile[]>('/v1/api/friendships/suggestions');
  },
};
