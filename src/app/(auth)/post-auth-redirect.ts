'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { syncRoleFromProfile } from '@/features/security';

/**
 * Where to send someone the moment they are signed in.
 *
 * THE LEGACY BRIDGE IS GONE AS OF P3.4c. This file used to open with "TEMPORARY LEGACY BRIDGE —
 * remove in security cycle 3", because `syncRoleFromProfile` lived in `lib/hooks/use-admin-role.ts`
 * and the feature only owned the *clearing* half of the `role` cookie. Both halves are now in
 * `features/security`, and this imports through its barrel like everything else.
 *
 * WHY A PROBE RATHER THAN A CLAIM: the backend puts no role in the JWT and exposes no role
 * endpoint, so the only way to learn it is `GET /profile/me`. `syncRoleFromProfile` does that
 * through the shared query cache, so the profile this costs is the same one the destination page
 * is about to read — not an extra request.
 *
 * IT STAYS AT THE ROUTE LAYER, not inside the feature, because *where to navigate after auth* is a
 * fact about this app's routes, not about the security domain. A `features/security` that knew
 * `/dashboard` and `/admin/moderation` would fail the extraction test for the sake of two strings.
 */
export function usePostAuthRedirect() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async function redirectAfterAuth() {
    const role = await syncRoleFromProfile(queryClient);
    router.replace(role === 'ADMIN' ? '/admin/moderation' : '/dashboard');
  };
}
