import type { QueryClient } from '@tanstack/react-query';
import { profileApi } from '@/lib/api/profile';
import { PROFILE_QUERY_KEY, toProfile } from '@/lib/hooks/use-user';

const ROLE_COOKIE = 'role';

/**
 * Fetches (and caches, via the same query key useProfile() reads) the current user's
 * profile, then syncs the `role` cookie from it. Middleware runs on the edge and can't
 * reach the react-query cache directly, so the cookie is the only channel available to it.
 * Call once right after login, and let each protected layout call it again if the cookie
 * is missing (e.g. a session that predates this cookie, or one that expired).
 */
export async function syncRoleFromProfile(
  queryClient: QueryClient
): Promise<'ADMIN' | 'USER' | null> {
  try {
    const profile = await queryClient.fetchQuery({
      queryKey: PROFILE_QUERY_KEY,
      queryFn: () => profileApi.getProfile().then((r) => toProfile(r.data)),
    });
    setRoleCookie(profile.role === 'ADMIN');
    return profile.role;
  } catch (error) {
    console.error('[syncRoleFromProfile] Failed to fetch profile for role routing:', error);
    return null;
  }
}

export function setRoleCookie(isAdmin: boolean) {
  document.cookie = `${ROLE_COOKIE}=${isAdmin ? 'ADMIN' : 'USER'}; path=/`;
}

export function clearRoleCookie() {
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`;
}

export function getCachedRole(): 'ADMIN' | 'USER' | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )role=(ADMIN|USER)/);
  return (match?.[1] as 'ADMIN' | 'USER' | undefined) ?? null;
}
