'use client';

import { AxiosError } from 'axios';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { githubApi } from '../api';
import type { GithubLinkInput } from '../types/github';
import { githubKeys } from './keys';

/**
 * GitHub state layer. Hooks return the feature's own types and stay free of toasts and
 * navigation; the screens own feedback.
 *
 * THE RECURRING THEME OF THIS DOMAIN IS THAT WRITES DO NOT REPORT WHAT THEY DID. Linking and
 * syncing both return `void`, and both call `syncGithubData`, which swallows every exception. So
 * every mutation here invalidates the stats query and the truth is whatever the re-read says —
 * there is no optimistic update anywhere in this file, and there should not be.
 */

export type GithubMutationOptions<TVariables, TData = void> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn'
>;

/** Whether a `useGithubStats` error is the benign "this user has not linked GitHub" case. */
export function isNotLinked(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 404;
}

/**
 * GET /stats/{userId}.
 *
 * A 404 IS AN ANSWER, NOT A FAILURE, so it is not retried. `getGithubStats` is
 * `findByUserId(...).orElseThrow`, so an unlinked user 404s every single time; leaving it on the
 * shared retry would issue a second pointless request and double the time before the screen can
 * admit the truth. Other statuses keep one retry, because those can be transient. Same shape as
 * `useProfessionalProfile` in `features/knowledge`, for the same reason.
 *
 * The 404 still surfaces as `isError` — consumers separate it with `isNotLinked` rather than this
 * hook inventing an empty stats object. A fabricated blank would make "never linked" look
 * identical to "linked but never synced", and those need different screens: one offers a link
 * button, the other says the sync has not worked yet.
 *
 * `undefined` disables it, so a screen can mount before it knows whose stats to ask for.
 */
export function useGithubStats(userId: number | undefined) {
  return useQuery({
    // Non-null assertion is safe: `enabled` gates the fn and the key is only built with an id.
    queryKey: githubKeys.stats(userId!),
    queryFn: () => githubApi.getStats(userId!),
    enabled: userId !== undefined,
    retry: (failureCount, error) => {
      if (isNotLinked(error)) return false;
      return failureCount < 1;
    },
  });
}

/**
 * GET /oauth/url — fetched on demand, never on mount.
 *
 * A MUTATION RATHER THAN A QUERY, and not because it writes anything. The URL is only wanted at
 * the moment someone clicks "link", and it is the last thing that happens before the browser
 * leaves this app — caching it under a query key would keep a value nobody will read again, and
 * prefetching it on mount would call the endpoint for every visitor who never clicks. Same
 * reasoning `features/knowledge` applies to `explainPost`.
 */
export function useGithubOAuthUrl(options?: GithubMutationOptions<void, { oauthUrl: string }>) {
  return useMutation({
    mutationFn: () => githubApi.getOAuthUrl(),
    ...options,
  });
}

/**
 * POST /oauth/callback — exchange the code and link.
 *
 * INVALIDATES THE STATS AND TRUSTS NOTHING ELSE. The endpoint returns `void`, and on a first-time
 * link a failed sync leaves no row at all while still answering 200 (B23). The refetch this
 * triggers is how a screen finds out whether the link actually happened: a 404 afterwards means
 * it did not.
 */
export function useLinkGithub(options?: GithubMutationOptions<GithubLinkInput>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GithubLinkInput) => githubApi.linkAccount(payload),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: githubKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

/**
 * POST /sync — refresh now.
 *
 * NOT RETRIED, because two of its three failure modes are deliberate refusals rather than
 * transient faults: 404 (not linked) and 409 (synced within the last hour). Retrying either would
 * turn a clear answer into a slower identical answer.
 *
 * Success invalidates the stats, which is also the only way to discover that a "successful" sync
 * did nothing — compare `lastSyncedAt` afterwards.
 */
export function useSyncGithub(options?: GithubMutationOptions<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => githubApi.syncNow(),
    retry: false,
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: githubKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

/** Whether a `useSyncGithub` error is the one-hour rate limit rather than a real fault. */
export function isSyncRateLimited(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 409;
}

/**
 * DELETE /unlink.
 *
 * Idempotent server-side, so this cannot report whether anything was removed — it invalidates and
 * lets the refetch say. `removeQueries` is deliberately NOT used: dropping the cache entry would
 * flash an empty screen before the 404 arrives, where invalidating keeps the last known state
 * visible until the answer replaces it.
 */
export function useUnlinkGithub(options?: GithubMutationOptions<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => githubApi.unlinkAccount(),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: githubKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}
