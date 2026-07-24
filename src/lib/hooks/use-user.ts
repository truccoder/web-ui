'use client';

import { useQuery } from '@tanstack/react-query';
import { profileApi } from '@/lib/api';
import { useAppSelector } from '@/core/store/hooks';
import type { Profile, UserResponse } from '@/lib/types';

// The profile-editing hooks (update/upload-picture/change-password) moved to
// features/security (P2.1"c). What remains is the shared "current user" read used by the
// app shell (admin/main layouts), the newsfeed/chat/posts surfaces, and the role sync —
// all still on legacy. It migrates domain-by-domain (posts P2.4, chat P2.7) and finally
// with the app shell in Phase 3.4.

export const PROFILE_QUERY_KEY = ['profile', 'me'];

export function toProfile(data: UserResponse): Profile {
  return {
    id: data.email,
    userId: data.id,
    fullname: data.fullName,
    email: data.email,
    username: data.username,
    profilePictureUrl: data.profilePictureUrl,
    emailVerified: data.emailVerified,
    role: data.role,
    createdAt: data.createdAt,
  };
}

export function useProfile() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => profileApi.getProfile().then((r) => toProfile(r.data)),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
