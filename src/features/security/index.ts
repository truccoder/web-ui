/**
 * `features/security` — mirrors the backend package `com.socialapp.security`
 * (AuthController 13 endpoints + ProfileController 4).
 *
 * Built across three checkpoint cycles but it stays ONE module with one barrel:
 * session+OAuth (this one), recovery, then profile. Do not split out
 * `features/auth/`.
 *
 * Everything outside this folder imports from here, never from a subpath.
 */

export { authApi, refreshSession } from './api';

export {
  securityKeys,
  useEstablishSession,
  useClearSession,
  useSession,
  useLogin,
  useRegister,
  useLogout,
  useOAuthUrl,
  useOAuthCallback,
} from './hooks';

export type {
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  LogoutRequest,
  GoogleLoginRequest,
  GithubLoginRequest,
  AuthResponse,
  OAuthUrlResponse,
  OAuthProvider,
} from './types';
