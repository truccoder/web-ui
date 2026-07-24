'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import type { OAuthProvider } from '../types/auth';
import { securityKeys } from './keys';
import { useEstablishSession } from './session';

const urlFetchers: Record<OAuthProvider, () => Promise<{ oauthUrl: string }>> = {
  google: authApi.getGoogleOAuthUrl,
  github: authApi.getGithubOAuthUrl,
};

const callbackHandlers: Record<
  OAuthProvider,
  (code: string) => ReturnType<typeof authApi.loginWithGoogle>
> = {
  google: (code) => authApi.loginWithGoogle({ code }),
  github: (code) => authApi.loginWithGithub({ code }),
};

/**
 * GET /v1/api/auth/{provider}/url — the address to send the browser to.
 *
 * A query rather than a mutation because the value is static: the backend builds
 * it by interpolating the configured client id and redirect uri
 * (`GoogleApiClient.getOAuthUrl`, `GithubApiClient.getOAuthUrl`) with no
 * per-request component, so it is safe to fetch once and reuse. `staleTime:
 * Infinity` therefore means "for this page session" — the cache does not survive
 * a reload, so a backend config change is picked up on the next load.
 *
 * Pass `enabled: false` to defer the request until the button is actually shown.
 */
export function useOAuthUrl(provider: OAuthProvider, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: securityKeys.oauthUrl(provider),
    queryFn: () => urlFetchers[provider](),
    staleTime: Infinity,
    enabled: options?.enabled ?? true,
  });
}

/**
 * POST /v1/api/auth/{provider}/callback — trades the authorization code returned
 * by the provider for our own tokens, then establishes the session.
 *
 * The provider redirects the browser to the frontend
 * (`GOOGLE_OAUTH_REDIRECT_URI` / `GITHUB_OAUTH_REDIRECT_URI` both point at
 * :3000), so the callback page reads `code` from the query string and hands it
 * here.
 *
 * The response carries `isNewUser` and `isAutoLinked`, which are only meaningful
 * on this path — the password and magic-link flows always report false. A screen
 * can use them to greet a first-time user or explain that an existing account was
 * linked by matching email.
 */
export function useOAuthCallback(provider: OAuthProvider) {
  const establishSession = useEstablishSession();

  return useMutation({
    mutationFn: (code: string) => callbackHandlers[provider](code),
    onSuccess: establishSession,
  });
}
