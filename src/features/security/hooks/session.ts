'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearTokens, setTokens } from '@/core/api/axios';
import { clearAuth, setCredentials } from '@/core/store/auth-slice';
import { useAppDispatch, useAppSelector } from '@/core/store/hooks';
import type { AuthResponse } from '../types/auth';

/**
 * Presence flag read by `src/middleware.ts` on the edge, which cannot see
 * localStorage or the react-query cache. It is not a credential — the Bearer
 * token is — so it carries no value beyond "a session exists".
 */
const SESSION_COOKIE = 'session';

/**
 * Cached verdict of whether the signed-in user is an admin. Written once the
 * profile is known; the middleware routes on it. Only cleared here — it is
 * *set* by the profile cycle (P2.1"), which owns `/profile/me`.
 */
const ROLE_COOKIE = 'role';

const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value}; path=/`;
};
const deleteCookie = (name: string) => {
  document.cookie = `${name}=; path=/; max-age=0`;
};

/**
 * Turns a successful auth response into a live session.
 *
 * Tokens are written twice on purpose. `setTokens` puts them in localStorage,
 * which is where the axios request interceptor reads them synchronously; the
 * Redux dispatch then makes them available to components, and `StoreProvider`'s
 * subscriber persists the same key again. Dropping the explicit write would
 * make the interceptor depend on store-subscription timing for the very first
 * request after login.
 */
export function useEstablishSession() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useCallback(
    (auth: AuthResponse) => {
      setTokens(auth.accessToken, auth.refreshToken);
      dispatch(setCredentials({ accessToken: auth.accessToken, refreshToken: auth.refreshToken }));
      setCookie(SESSION_COOKIE, 'true');
      // Anything cached before sign-in belongs to the anonymous (or previous)
      // identity. Clearing is cheaper than auditing every key for tenancy.
      queryClient.clear();
    },
    [dispatch, queryClient]
  );
}

/**
 * Tears the session down locally. Safe to call even when the server-side logout
 * failed — a revoked-or-not refresh token is still useless once discarded here.
 */
export function useClearSession() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useCallback(() => {
    clearTokens();
    dispatch(clearAuth());
    deleteCookie(SESSION_COOKIE);
    deleteCookie(ROLE_COOKIE);
    // Drop every cached response so the next user on this browser cannot read
    // the previous one's data out of the query cache.
    queryClient.clear();
  }, [dispatch, queryClient]);
}

/** Current session as held in Redux. Client state, not server state. */
export function useSession() {
  return useAppSelector((s) => s.auth);
}
