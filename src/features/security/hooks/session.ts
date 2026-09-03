'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearTokens, setTokens } from '@/core/api/axios';
import { clearSessionFlags, markSessionPresent } from '@/core/api/session-flags';
import { purgeOfflineCache } from '@/core/pwa/purge-offline-cache';
import { clearAuth, setCredentials } from '@/core/store/auth-slice';
import { useAppDispatch, useAppSelector } from '@/core/store/hooks';
import type { AuthResponse } from '../types/auth';

/**
 * THE COOKIES MOVED TO `core/api/session-flags` and are no longer declared here.
 *
 * They used to be, and the axios response interceptor — which is not a hook and cannot call
 * `useClearSession` — had to clear a session without them. It cleared the tokens only, and the
 * leftover `session=true` made the middleware bounce every visit to `/login` back to the feed.
 * One definition, imported by both, is what stops that from happening again.
 */

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
      markSessionPresent();
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
    clearSessionFlags();
    // Drop every cached response so the next user on this browser cannot read
    // the previous one's data out of the query cache.
    queryClient.clear();
    // And the same again for the service worker's cache, which holds page documents rendered
    // with THIS session's chrome and outlives everything above. See `core/pwa`.
    purgeOfflineCache();
  }, [dispatch, queryClient]);
}

/** Current session as held in Redux. Client state, not server state. */
export function useSession() {
  return useAppSelector((s) => s.auth);
}
