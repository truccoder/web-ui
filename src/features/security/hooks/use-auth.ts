'use client';

import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import type { LoginRequest, RegisterRequest } from '../types/auth';
import { useClearSession, useEstablishSession, useSession } from './session';

/**
 * Session mutations for `com.socialapp.security` (AuthController, cycle 1 of 3).
 *
 * These deliberately do NOT navigate or raise toasts. The state layer owns server
 * calls and session state; where to send the user afterwards and what to tell them
 * is a screen decision, and baking it in here would make every caller inherit one
 * page's routing. The pages wire that up in the UI checkpoint.
 */

/** POST /v1/api/auth/login — establishes the session on success. */
export function useLogin() {
  const establishSession = useEstablishSession();

  return useMutation({
    mutationFn: (body: LoginRequest) => authApi.login(body),
    onSuccess: establishSession,
  });
}

/**
 * POST /v1/api/auth/register — does NOT sign the user in.
 *
 * The endpoint returns void: the backend sends a verification email and the user
 * logs in separately. Do not call `useEstablishSession` here.
 */
export function useRegister() {
  return useMutation({
    mutationFn: (vars: { body: RegisterRequest; profilePicture?: File }) =>
      authApi.register(vars.body, vars.profilePicture),
  });
}

/**
 * POST /v1/api/auth/logout — revokes the refresh token server-side.
 *
 * Local teardown runs in `onSettled`, not `onSuccess`: if the request fails (token
 * already expired, backend unreachable), the user still expects to be logged out,
 * and leaving credentials behind after they clicked "log out" is the worse failure.
 */
export function useLogout() {
  const clearSession = useClearSession();
  const session = useSession();

  return useMutation({
    mutationFn: () => {
      const refreshToken = session.refreshToken;
      // Nothing to revoke without a token; skip the round trip.
      if (!refreshToken) return Promise.resolve();
      return authApi.logout({ refreshToken });
    },
    onSettled: clearSession,
  });
}
