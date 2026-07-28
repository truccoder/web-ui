import api from '@/core/api/axios';
import type { AuthResponse } from '../types/auth';
import type {
  ForgotPasswordRequest,
  MagicLinkLoginRequest,
  MagicLinkRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from '../types/recovery';

/**
 * Recovery + email-verification + magic-link endpoints of AuthController
 * (security cycle 2). One function per backend operation, bare-DTO responses.
 *
 * Kept separate from `authApi` (session + OAuth) so each cycle's surface reads on its
 * own; both are re-exported from the feature barrel. All but `loginWithMagicLink`
 * return void — the backend acts by sending an email, not by replying with data.
 */
export const recoveryApi = {
  /** POST /v1/api/auth/forgot-password — emails a reset link. */
  forgotPassword: (body: ForgotPasswordRequest) =>
    api.post<void>('/v1/api/auth/forgot-password', body).then((r) => r.data),

  /** POST /v1/api/auth/reset-password — sets a new password using the emailed token. */
  resetPassword: (body: ResetPasswordRequest) =>
    api.post<void>('/v1/api/auth/reset-password', body).then((r) => r.data),

  /** POST /v1/api/auth/verify-email — activates the account using the emailed token. */
  verifyEmail: (body: VerifyEmailRequest) =>
    api.post<void>('/v1/api/auth/verify-email', body).then((r) => r.data),

  /** POST /v1/api/auth/magic-link — emails a passwordless sign-in link. */
  requestMagicLink: (body: MagicLinkRequest) =>
    api.post<void>('/v1/api/auth/magic-link', body).then((r) => r.data),

  /**
   * POST /v1/api/auth/magic-link/login — trades the emailed token for a session.
   *
   * The only recovery call that establishes a session: possessing the token proves
   * email ownership, so this path is exempt from the verified-email check that
   * password login enforces.
   */
  loginWithMagicLink: (body: MagicLinkLoginRequest) =>
    api.post<AuthResponse>('/v1/api/auth/magic-link/login', body).then((r) => r.data),
};
