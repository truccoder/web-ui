import type { OAuthProvider } from '../types/auth';

/**
 * Query keys for `features/security`, all under one namespace so the whole domain
 * can be invalidated or removed with a single prefix. Never build a security key
 * inline at a call site — add it here.
 */
export const securityKeys = {
  all: ['security'] as const,
  oauthUrl: (provider: OAuthProvider) => ['security', 'oauth-url', provider] as const,
  /**
   * The signed-in user's profile (`GET /profile/me`). The role-sync bridge in the auth
   * routes derives the admin cookie from the same endpoint; when that logic moves into
   * the feature (cycle 3 wiring), it should read this cache rather than fetch again.
   */
  profile: () => ['security', 'profile', 'me'] as const,
};
