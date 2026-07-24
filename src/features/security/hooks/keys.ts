import type { OAuthProvider } from '../types/auth';

/**
 * Query keys for `features/security`, all under one namespace so the whole domain
 * can be invalidated or removed with a single prefix. Never build a security key
 * inline at a call site — add it here.
 */
export const securityKeys = {
  all: ['security'] as const,
  oauthUrl: (provider: OAuthProvider) => ['security', 'oauth-url', provider] as const,
};
