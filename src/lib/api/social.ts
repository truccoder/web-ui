import api from './axios';
import type { Profile, Page } from '@/lib/types';

export const socialApi = {
  follow: (followedId: string) => api.post<void>(`/v1/api/social/follow/${followedId}`),

  unfollow: (followedId: string) => api.post<void>(`/v1/api/social/unfollow/${followedId}`),

  getFollowing: (offset: number, pageSize: number) =>
    api.get<Page<Profile>>('/v1/api/social/following', {
      params: { offset, pageSize },
    }),

  getFollowers: (offset: number, pageSize: number) =>
    api.get<Page<Profile>>('/v1/api/social/followers', {
      params: { offset, pageSize },
    }),

  block: (blockedId: string) => api.post<void>(`/v1/api/social/block/${blockedId}`),

  unblock: (blockedId: string) => api.post<void>(`/v1/api/social/unblock/${blockedId}`),

  getBlockedUsers: (offset: number, pageSize: number) =>
    api.get<Page<Profile>>('/v1/api/social/blocked', {
      params: { offset, pageSize },
    }),
};
