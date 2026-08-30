'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { moderationApi } from '../api';
import type {
  AdminReviewInput,
  ModerationSearchParams,
  CreateReportInput,
} from '../types/moderation';
import type { Appeal, AppealDecisionInput, AppealInput, AppealStatus } from '../types/moderation';
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

/**
 * GET /reports — what readers have flagged.
 *
 * READ-ONLY, SO THERE IS NO MUTATION BESIDE IT. Nothing marks a report handled server-side; see
 * the type note on `PostReport`. `enabled` matches the other tab hooks so the admin screen only
 * fetches the list it is showing.
 */
export function useReports(postId?: number, page = 1, size = 10, enabled = true) {
  return useQuery({
    queryKey: moderationKeys.reports(postId, page, size),
    queryFn: () => moderationApi.getReports(postId, page, size),
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

/**
 * GET /admin/moderation/appeals — the queue an admin works.
 *
 * `status` IS IN THE KEY because the server filters on it: each status is a different response,
 * and sharing a key would let the last-fetched filter overwrite the cache for the others. Same
 * reasoning as the post and log searches.
 */
export function useAppeals(status: AppealStatus = 'PENDING', page = 1, size = 10) {
  return useQuery({
    queryKey: moderationKeys.appeals(status, page, size),
    queryFn: () => moderationApi.getAppeals(status, page, size),
  });
}

export interface AppealDecisionVariables {
  appealId: number;
  payload?: AppealDecisionInput;
}

/**
 * Approving and rejecting both invalidate the WHOLE domain, and approving is the reason why.
 *
 * A rejection only moves the appeal between statuses. An approval **erases the violation and
 * re-evaluates the ban**, which can take a user off the banned list and changes what the logs
 * describe — three branches move at once and none of them is derivable from the response.
 */
export function useApproveAppeal(
  options?: ModerationMutationOptions<AppealDecisionVariables, Appeal>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appealId, payload }: AppealDecisionVariables) =>
      moderationApi.approveAppeal(appealId, payload),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

/** POST /admin/moderation/appeals/{id}/reject — the sanction stands. */
export function useRejectAppeal(
  options?: ModerationMutationOptions<AppealDecisionVariables, Appeal>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appealId, payload }: AppealDecisionVariables) =>
      moderationApi.rejectAppeal(appealId, payload),
    ...options,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.all });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

/**
 * ─── THE USER SIDE ──────────────────────────────────────────────────────────────────────────
 *
 * `GET /moderation/my-violations` and `GET /moderation/appeals` are the only moderation reads an
 * ordinary account can make, and together they answer one question: what has this product decided
 * about me, and did contesting it go anywhere.
 */

/** What has been recorded against the signed-in account. */
export function useMyViolations() {
  return useQuery({
    queryKey: moderationKeys.myViolations,
    queryFn: moderationApi.getMyViolations,
  });
}

/** The signed-in account's own appeals, with the reviewer's decision once there is one. */
export function useMyAppeals() {
  return useQuery({
    queryKey: moderationKeys.myAppeals,
    queryFn: moderationApi.getMyAppeals,
  });
}

/**
 * Submitting an appeal invalidates BOTH lists, not just the appeals one.
 *
 * The new appeal obviously belongs in `myAppeals` — but it also flips `appealPending` on the
 * violation it contests, and that flag is what removes the appeal button from the row. Refreshing
 * only the appeals list would leave the button live on a violation that already has one, and the
 * backend rejects the duplicate.
 */
export function useSubmitAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AppealInput) => moderationApi.submitAppeal(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.mine });
    },
  });
}

/**
 * Report a post.
 *
 * NOTHING TO INVALIDATE. The reporter cannot read the moderation queue, and the post itself does
 * not change — a report is a vote toward a threshold, and the threshold is the server's business.
 * So this deliberately touches no cache: showing anything as "changed" would be inventing a
 * consequence the reader has no way to observe.
 */
export function useReportPost(options?: { onSuccess?: () => void }) {
  return useMutation({
    mutationFn: (payload: CreateReportInput) => moderationApi.reportPost(payload),
    onSuccess: () => options?.onSuccess?.(),
  });
}
