'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { moderationApi } from '../api';
import type { AdminReviewInput, ModerationSearchParams } from '../types/moderation';
import { moderationKeys } from './keys';

/**
 * Moderation state layer. Hooks return the feature's own types and stay free of toasts and
 * navigation; the screens own feedback. Same shape as every other feature here.
 *
 * NOTHING HERE GATES ON A ROLE, unlike `features/roadmap`. These endpoints sit under
 * `/v1/api/admin/**`, which `SecurityConfig` enforces at the URL level, and the screens live
 * under the `(admin)` route group whose layout already refuses a non-admin session. A third check
 * inside the hooks would be ceremony.
 */

export type ModerationMutationOptions<TVariables, TData = void> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn'
>;

/**
 * GET /posts — the review queue.
 *
 * `placeholderData` keeps the previous page on screen while the next one loads, so paging does
 * not blank the table and bounce the scroll position. It is the one piece of paging polish worth
 * having here: every row is tall (content plus history), so a flash of empty state is a big
 * visual jump.
 */
export function useModerationPosts(params: ModerationSearchParams = {}) {
  return useQuery({
    queryKey: moderationKeys.posts(params),
    queryFn: () => moderationApi.searchPosts(params),
    placeholderData: (previous) => previous,
  });
}

/** GET /logs — raw history rows across all posts. */
export function useModerationLogs(params: ModerationSearchParams = {}) {
  return useQuery({
    queryKey: moderationKeys.logs(params),
    queryFn: () => moderationApi.searchLogs(params),
    placeholderData: (previous) => previous,
  });
}

/**
 * GET /banned-users — everyone with a ban in their history.
 *
 * `enabled` exists so a tabbed screen does not fetch all three lists on mount. The endpoint takes
 * no filters, so there is nothing to key on but the page.
 */
export function useBannedUsers(page = 1, size = 10, enabled = true) {
  return useQuery({
    queryKey: moderationKeys.bannedUsers(page, size),
    queryFn: () => moderationApi.getBannedUsers(page, size),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export interface ReviewPostVariables {
  postId: number;
  payload: AdminReviewInput;
}

/**
 * POST /posts/{postId}/review.
 *
 * INVALIDATES THE WHOLE DOMAIN, not one list, and that is proportionate rather than lazy: a
 * decision changes the post's status (queue), appends a history row (logs), and on a rejection
 * can push the author over the threshold into a ban (banned users). Three branches genuinely move
 * at once, the response is `void` so none of them can be patched, and the filters live in the
 * keys so there is no way to know which cached filter combinations contained this post.
 *
 * WHAT IT DELIBERATELY DOES NOT TOUCH: the newsfeed. Approving calls `fanOutPost`, so the post
 * appears in feeds — but that is another domain's cache, which CLAUDE.md §4 forbids this hook
 * from invalidating. A screen showing both passes its own `onSuccess`.
 *
 * FAILURE IS A NORMAL OUTCOME, as on the roadmap queue: only a `PENDING_REVIEW` post can be
 * reviewed, so two admins working the same list means the second gets an error rather than a
 * no-op. The UI must show it rather than assume it acted.
 */
export function useReviewPost(options?: ModerationMutationOptions<ReviewPostVariables>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, payload }: ReviewPostVariables) =>
      moderationApi.reviewPost(postId, payload),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}
