'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../api/profile';
import type { ChangePasswordRequest, UpdateProfileRequest, UserProfile } from '../types/profile';
import { securityKeys } from './keys';

/**
 * Profile state layer for ProfileController (security cycle 3).
 *
 * The single query is the signed-in user's profile; the mutations write the fresh
 * server response straight back into that cache (setQueryData) rather than invalidating,
 * so the UI updates without a refetch. Server state stays in React Query, never Redux.
 */

/** GET /v1/api/profile/me — the signed-in user's profile. */
export function useMyProfile() {
  return useQuery({
    queryKey: securityKeys.profile(),
    queryFn: () => profileApi.getMyProfile(),
  });
}

/** PUT /v1/api/profile — updates the display name; response replaces the cached profile. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => profileApi.updateProfile(body),
    onSuccess: (profile) => {
      queryClient.setQueryData(securityKeys.profile(), profile);
    },
  });
}

/** PUT /v1/api/profile/password — returns void, so no cache to update. */
export function useChangePassword() {
  return useMutation({
    mutationFn: (body: ChangePasswordRequest) => profileApi.changePassword(body),
  });
}

/**
 * PUT /v1/api/profile/picture — patches only the picture URL into the cached profile
 * (the response carries just that field), avoiding a full refetch.
 */
export function useChangeProfilePicture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => profileApi.changeProfilePicture(file),
    onSuccess: ({ profilePictureUrl }) => {
      queryClient.setQueryData<UserProfile>(securityKeys.profile(), (old) =>
        old ? { ...old, profilePictureUrl } : old
      );
    },
  });
}
