'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { clearTokens, getTokens } from '@/core/api/axios';
import { clearAuth } from '@/core/store/auth-slice';
import { useAppDispatch, useAppSelector } from '@/core/store/hooks';
import { clearRoleCookie } from '@/lib/hooks/use-admin-role';
import { PROFILE_QUERY_KEY } from '@/lib/hooks/use-user';

// Login/register/recovery have all moved to features/security. Only useLogout remains,
// backing the app shell (admin/main layouts); it migrates in Phase 3.4.

export function useLogout() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);

  return useMutation({
    mutationFn: () =>
      authApi.logout({ refreshToken: refreshToken ?? getTokens()?.refreshToken ?? '' }),
    onSettled: () => {
      clearTokens();
      dispatch(clearAuth());
      document.cookie = 'session=; path=/; max-age=0';
      clearRoleCookie();
      queryClient.removeQueries({ queryKey: PROFILE_QUERY_KEY });
      router.push('/login');
    },
  });
}
