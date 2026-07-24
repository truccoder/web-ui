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

export { authApi, refreshSession, recoveryApi, profileApi } from './api';

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
  useForgotPassword,
  useResetPassword,
  useVerifyEmail,
  useRequestMagicLink,
  useMagicLinkLogin,
  useMyProfile,
  useUpdateProfile,
  useChangePassword,
  useChangeProfilePicture,
} from './hooks';

export {
  LoginForm,
  type LoginFormProps,
  RegisterForm,
  OAuthButtons,
  OAuthCallback,
  type OAuthCallbackProps,
  RequestLinkForm,
  type RequestLinkFormProps,
  type RequestLinkVariant,
  VerifyEmailStatus,
  MagicLoginCallback,
  type MagicLoginCallbackProps,
  ResetPasswordForm,
} from './components';

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
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  MagicLinkRequest,
  MagicLinkLoginRequest,
  UserProfile,
  UserRole,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ProfilePictureResponse,
} from './types';
