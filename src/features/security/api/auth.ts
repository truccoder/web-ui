import api from '@/core/api/axios';
import type {
  AuthResponse,
  GithubLoginRequest,
  GoogleLoginRequest,
  LoginRequest,
  LogoutRequest,
  OAuthUrlResponse,
  RefreshTokenRequest,
  RegisterRequest,
} from '../types/auth';

/**
 * Session + OAuth endpoints of `com.socialapp.security` (AuthController).
 * One function per backend operation, no wrapper object around the response —
 * the backend returns bare DTOs (`ApiResponse.java` is empty).
 *
 * These resolve to the response body rather than the raw `AxiosResponse` so the
 * hooks layer does not repeat `.then((r) => r.data)` at every call site.
 *
 * NOT here, deliberately:
 * - `POST /v1/api/auth/refresh` is called by the axios interceptor in
 *   `core/api/axios.ts`, not from feature code. Exposing a second caller would
 *   defeat the single-flight dedupe that keeps concurrent 401s from burning the
 *   single-use refresh token. It is counted against this cycle's 8 endpoints
 *   because core already consumes it.
 * - Password recovery, magic link and email verification live in `./recovery`
 *   (cycle 2); profile endpoints come in the cycle after.
 */

export const authApi = {
  /** POST /v1/api/auth/login */
  login: (body: LoginRequest) =>
    api.post<AuthResponse>('/v1/api/auth/login', body).then((r) => r.data),

  /**
   * POST /v1/api/auth/register — multipart.
   *
   * The backend takes `@RequestPart("metadata") RegisterRequestDto` plus an
   * optional `profilePicture` part, so the JSON half must be sent as a Blob with
   * an explicit `application/json` type; a plain string part would arrive as
   * text/plain and fail to bind.
   *
   * Content-Type is deliberately not set: only the browser can generate the
   * multipart boundary, and the axios instance already strips its JSON default
   * for FormData bodies.
   */
  register: (body: RegisterRequest, profilePicture?: File) => {
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(body)], { type: 'application/json' }));
    if (profilePicture) formData.append('profilePicture', profilePicture);
    return api.post<void>('/v1/api/auth/register', formData).then((r) => r.data);
  },

  /** POST /v1/api/auth/logout — revokes the supplied refresh token server-side. */
  logout: (body: LogoutRequest) => api.post<void>('/v1/api/auth/logout', body).then((r) => r.data),

  /** GET /v1/api/auth/google/url */
  getGoogleOAuthUrl: () => api.get<OAuthUrlResponse>('/v1/api/auth/google/url').then((r) => r.data),

  /** POST /v1/api/auth/google/callback — exchanges the authorization code for tokens. */
  loginWithGoogle: (body: GoogleLoginRequest) =>
    api.post<AuthResponse>('/v1/api/auth/google/callback', body).then((r) => r.data),

  /** GET /v1/api/auth/github/url */
  getGithubOAuthUrl: () => api.get<OAuthUrlResponse>('/v1/api/auth/github/url').then((r) => r.data),

  /** POST /v1/api/auth/github/callback — exchanges the authorization code for tokens. */
  loginWithGithub: (body: GithubLoginRequest) =>
    api.post<AuthResponse>('/v1/api/auth/github/callback', body).then((r) => r.data),
};

/**
 * POST /v1/api/auth/refresh — exported for completeness and for tests, but the
 * live caller is the response interceptor in `core/api/axios.ts`. Do not call it
 * from a component or hook: the interceptor shares one in-flight promise so that
 * two simultaneous 401s cannot both spend the single-use refresh token.
 */
export const refreshSession = (body: RefreshTokenRequest) =>
  api.post<AuthResponse>('/v1/api/auth/refresh', body).then((r) => r.data);
