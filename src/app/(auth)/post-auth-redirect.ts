'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { syncRoleFromProfile } from '@/lib/hooks/use-admin-role';

/**
 * TEMPORARY LEGACY BRIDGE — remove in security cycle 3 (P2.1″, profile).
 *
 * The backend has no role claim in the JWT and no dedicated role endpoint, so after
 * sign-in the client probes `GET /profile/me`, caches the verdict in the `role` cookie
 * (middleware reads it on the edge), and routes admins to moderation. That endpoint
 * belongs to the profile cycle; until it is migrated into `features/security`, the auth
 * routes reuse the legacy `syncRoleFromProfile`.
 *
 * This lives at the route layer rather than inside the feature on purpose: it keeps the
 * feature's only out-of-boundary import at `@/lib/i18n`. When profile lands in the
 * feature, role routing becomes a feature hook and this file is deleted.
 */
export function usePostAuthRedirect() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async function redirectAfterAuth() {
    const role = await syncRoleFromProfile(queryClient);
    router.replace(role === 'ADMIN' ? '/admin/moderation' : '/dashboard');
  };
}
