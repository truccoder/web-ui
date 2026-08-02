'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
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

/**
 * ROLE ROUTING — the writer half of the `role` cookie, moved here at P3.4c.
 *
 * `hooks/session.ts` has always *cleared* this cookie on logout and said in as many words that
 * setting it "is owned by the profile cycle, which owns `/profile/me`". Until P3.4c the writer
 * still lived in `lib/hooks/use-admin-role.ts` behind a file that called itself a TEMPORARY LEGACY
 * BRIDGE; this closes that. The two halves now sit in the same feature.
 *
 * WHY A COOKIE AT ALL, since it looks like duplicated state: `src/middleware.ts` runs on the edge,
 * where there is no localStorage and no React Query cache. A cookie is the only channel it can
 * read. It is a routing hint, never an authorisation decision — the backend gates every admin
 * endpoint itself, and a user who forges `role=ADMIN` reaches an admin URL that answers 403.
 */

const ROLE_COOKIE = 'role';

/** Writes the routing hint the edge middleware reads. */
export function setRoleCookie(isAdmin: boolean) {
  document.cookie = `${ROLE_COOKIE}=${isAdmin ? 'ADMIN' : 'USER'}; path=/`;
}

/**
 * Fetches the profile through the shared cache and syncs the cookie from it. Call once right
 * after sign-in, when nothing has rendered `useMyProfile` yet.
 *
 * `fetchQuery` on `securityKeys.profile()` rather than a bare API call, so the response also
 * warms the cache every profile-reading surface is about to hit — the keys file asks for exactly
 * this. Returns `null` rather than throwing: a failed role probe should land the user on the
 * regular app, not on an error, and an admin who ends up in `(main)` is redirected out by that
 * layout anyway.
 */
async function syncRoleFromProfile(queryClient: QueryClient): Promise<UserProfile['role'] | null> {
  try {
    const profile = await queryClient.fetchQuery({
      queryKey: securityKeys.profile(),
      queryFn: () => profileApi.getMyProfile(),
    });
    setRoleCookie(profile.role === 'ADMIN');
    return profile.role;
  } catch (error) {
    console.error('[syncRoleFromProfile] could not read the profile for role routing:', error);
    return null;
  }
}

/**
 * THE HOOK IS THE PUBLIC SHAPE; the function above is not exported. Added at P3.5/P3.6.
 *
 * The barrel used to export `syncRoleFromProfile(queryClient)` directly, which forced its one
 * caller — `app/(auth)/post-auth-redirect.ts` — to call `useQueryClient()` itself. That made a
 * route file the only thing in `src/app` importing `@tanstack/react-query`, and P3.6's whole
 * criterion is that routes compose feature surfaces rather than touch the data layer. Taking the
 * client here instead removes the last one.
 *
 * It returns a callback rather than running on mount: the caller decides *when* sign-in finished.
 */
export function useSyncRoleFromProfile() {
  const queryClient = useQueryClient();
  return useCallback(() => syncRoleFromProfile(queryClient), [queryClient]);
}
