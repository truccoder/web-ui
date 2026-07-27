'use client';

import { useMutation } from '@tanstack/react-query';
import { recoveryApi } from '../api/recovery';
import type {
  ForgotPasswordRequest,
  MagicLinkLoginRequest,
  MagicLinkRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from '../types/recovery';
import { useEstablishSession } from './session';

/**
 * Recovery mutations for AuthController (security cycle 2).
 *
 * Like the session hooks, these do not navigate or toast — the state layer owns the
 * call, the screen owns what to show and where to go afterward. No query keys are
 * touched: four of these send emails and change no cached server state, and
 * reset/verify change backend state with no on-screen representation to invalidate.
 */

/** POST /v1/api/auth/forgot-password — emails a reset link. */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (body: ForgotPasswordRequest) => recoveryApi.forgotPassword(body),
  });
}

/** POST /v1/api/auth/reset-password — sets a new password from the emailed token. */
export function useResetPassword() {
  return useMutation({
    mutationFn: (body: ResetPasswordRequest) => recoveryApi.resetPassword(body),
  });
}

/** POST /v1/api/auth/verify-email — activates the account from the emailed token. */
export function useVerifyEmail() {
  return useMutation({
    mutationFn: (body: VerifyEmailRequest) => recoveryApi.verifyEmail(body),
  });
}

/** POST /v1/api/auth/magic-link — emails a passwordless sign-in link. */
export function useRequestMagicLink() {
  return useMutation({
    mutationFn: (body: MagicLinkRequest) => recoveryApi.requestMagicLink(body),
  });
}

/**
 * POST /v1/api/auth/magic-link/login — the only recovery call that yields a session,
 * so it establishes one on success (same helper the password/OAuth flows use).
 */
export function useMagicLinkLogin() {
  const establishSession = useEstablishSession();
  return useMutation({
    mutationFn: (body: MagicLinkLoginRequest) => recoveryApi.loginWithMagicLink(body),
    onSuccess: establishSession,
  });
}
