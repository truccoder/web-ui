import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/* ── Requests ───────────────────────────────────────────────────────────────
   These come out of the generator non-optional already: the Java DTOs carry
   Jakarta validation (@NotBlank/@Email/@Size), which springdoc reports as
   `required`. Nothing to tighten. */

export type LoginRequest = Schemas['LoginRequestDto'];
export type RegisterRequest = Schemas['RegisterRequestDto'];
export type RefreshTokenRequest = Schemas['RefreshTokenRequestDto'];
/** Logout revokes a specific refresh token, so it takes the same body as refresh. */
export type LogoutRequest = Schemas['RefreshTokenRequestDto'];
export type GoogleLoginRequest = Schemas['GoogleLoginRequestDto'];
export type GithubLoginRequest = Schemas['GithubLoginRequestDto'];

/* ── Responses ──────────────────────────────────────────────────────────────
   Response DTOs have no validation annotations, so springdoc marks nothing
   required and every generated field is optional. That is a gap in the spec,
   not in the backend — confirmed against the Java source below and tightened
   here so callers do not litter the UI with `?.` on values that always exist. */

/**
 * Every field is guaranteed present.
 *
 * `AuthResponseDto` is a Java record constructed in exactly one place —
 * `security/service/TokenService.java:42` (`issueTokens`) — which always passes
 * an access token, a freshly persisted refresh token, the `TOKEN_TYPE`
 * constant, and a computed expiry. `expiresIn`, `isAutoLinked` and `isNewUser`
 * are Java primitives (`long`, `boolean`), so they cannot be null at all.
 *
 * `isAutoLinked` / `isNewUser` are meaningful only on the OAuth callbacks; the
 * password and magic-link paths call the two-arg `issueTokens` and get `false`.
 */
export type AuthResponse = Required<Schemas['AuthResponseDto']>;

/**
 * `oauthUrl` is always populated — `OAuthAuthService` builds the URL from
 * configured client id + redirect uri and returns it directly. The field is
 * optional in the spec only because the DTO is a plain Lombok `@Data` class
 * with no validation annotations.
 */
export type OAuthUrlResponse = Required<Schemas['OAuthUrlResponseDto']>;

/** Which provider an OAuth flow belongs to. Not a backend enum — the two paths are distinct endpoints. */
export type OAuthProvider = 'google' | 'github';
