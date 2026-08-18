import api from '@/core/api/axios';
import type {
  Appeal,
  AppealDecisionInput,
  AppealInput,
  AppealPage,
  AppealStatus,
  UserViolation,
  AdminReviewInput,
  BannedUserPage,
  ModerationLogPage,
  ModerationSearchParams,
  PostModerationPage,
} from '../types/moderation';

/**
 * `AdminModerationController` (`/v1/api/admin/moderation`) — 4 endpoints, 4 functions.
 *
 * EVERY PATH HERE IS GENUINELY ADMIN-ONLY. `SecurityConfig` matches `/v1/api/admin/**` and
 * requires `hasRole("ADMIN")`, and URL-level rules are the half of Spring Security this backend
 * actually enables. So unlike `features/roadmap` (B20), the client-side gate on these screens is
 * a convenience, not the only thing standing between a user and the data.
 *
 * PAGINATION IS 1-BASED ON THE WAY IN AND 0-BASED ON THE WAY BACK, on all three list endpoints.
 * `@RequestParam(defaultValue = "1") @Positive int page` then `PageRequest.of(page - 1, size)`,
 * so `page=0` is a **400**, not the first page, while the response's `number` is Spring's 0-based
 * index. Anything computing "the next page" from `number` adds 2.
 */
export const moderationApi = {
  /**
   * GET /v1/api/admin/moderation/posts — the review queue.
   *
   * Every filter is optional and they are AND-ed. `status` is what makes this a queue rather than
   * a list: `PENDING_REVIEW` is the only status `reviewPost` will act on, so that is the filter a
   * moderator actually works from.
   *
   * EACH ROW COSTS TWO EXTRA QUERIES SERVER-SIDE. `toDetailDto` looks the author up by id and
   * reads the whole moderation history per post, neither of which is joined or batched. Nothing
   * the frontend can fix, but it is the reason to keep `size` modest rather than fetching 100
   * rows to filter them client-side.
   */
  searchPosts: (params: ModerationSearchParams = {}) =>
    api.get<PostModerationPage>('/v1/api/admin/moderation/posts', { params }).then((r) => r.data),

  /**
   * GET /v1/api/admin/moderation/logs — raw history rows across all posts.
   *
   * Same filters as the post search, and deliberately a separate surface: this returns log rows
   * unattached to their post, which is what you want when auditing what the classifier has been
   * doing rather than deciding a specific post.
   */
  searchLogs: (params: ModerationSearchParams = {}) =>
    api.get<ModerationLogPage>('/v1/api/admin/moderation/logs', { params }).then((r) => r.data),

  /**
   * GET /v1/api/admin/moderation/banned-users — everyone with a ban in their history.
   *
   * NO FILTERS, ONLY PAGING — there is no `?currentlyBanned=` and the list includes users whose
   * ban has already expired. Narrowing to the currently-banned is therefore a client-side filter
   * over a page, which cannot be complete; the honest surface shows the whole list and marks each
   * row's state.
   */
  getBannedUsers: (page = 1, size = 10) =>
    api
      .get<BannedUserPage>('/v1/api/admin/moderation/banned-users', { params: { page, size } })
      .then((r) => r.data),

  /**
   * POST /v1/api/admin/moderation/posts/{postId}/review — decide one post.
   *
   * THE SIX-VALUE SCALE IS A TWO-VALUE DECISION, and the UI must not pretend otherwise.
   * `decision` is a `Likelihood` (`UNKNOWN` … `VERY_LIKELY`), but `reviewPost` immediately
   * collapses it to `decision.isAtLeast(LIKELY)`, and the log row it writes stores only
   * `APPROVED` or `REJECTED`. The four sub-threshold values are indistinguishable after the call
   * and so are the two above it. Offering a six-way picker would invite a moderator to express a
   * nuance the system throws away — the screens send `VERY_UNLIKELY` to approve and
   * `VERY_LIKELY` to reject, the two unambiguous ends of the scale.
   *
   * REJECTING IS NOT JUST A STATUS CHANGE. It calls `userBanService.recordViolation`, which is
   * what escalates to an automatic ban — two violations ban the author for seven days, and that
   * ban blocks `/auth/login` outright. A reject here can lock someone out of the product.
   *
   * AND THE RECORDED REASON IS ALWAYS `HATE_SPEECH`, hardcoded, whatever the post actually did.
   * The endpoint takes no violation type, so a rejected spam post is filed as hate speech in the
   * user's ban history. `feedback` is the only place the real reason can go, which makes it worth
   * filling in even though it is optional. Raised as B22.
   *
   * ONLY A `PENDING_REVIEW` POST CAN BE REVIEWED — anything else answers **409 Conflict** with
   * "Post is not in PENDING_REVIEW status" (measured, by reviewing an already-rejected post).
   * Two admins working the queue means the second gets an error rather than a no-op.
   *
   * Approving also calls `fanOutPost`, so an approved post enters the feed at that moment rather
   * than at creation.
   */
  reviewPost: (postId: number, payload: AdminReviewInput) =>
    api.post<void>(`/v1/api/admin/moderation/posts/${postId}/review`, payload).then((r) => r.data),

  /**
   * GET /v1/api/admin/moderation/appeals — the appeal queue.
   *
   * DEFAULTS TO `PENDING` SERVER-SIDE, "because that is the only status with anything to do".
   * The parameter exists so a decided appeal can still be looked up, which is why this passes it
   * explicitly rather than relying on the default: a queue that silently only ever shows one
   * status is a queue whose filter nobody can find.
   */
  getAppeals: (status: AppealStatus = 'PENDING', page = 1, size = 10) =>
    api
      .get<AppealPage>('/v1/api/admin/moderation/appeals', { params: { status, page, size } })
      .then((r) => r.data),

  /**
   * POST /v1/api/admin/moderation/appeals/{appealId}/approve.
   *
   * NOT A STATUS CHANGE — approving **erases the violation and re-evaluates the ban**. So this can
   * unlock an account, which is the mirror image of `reviewPost`'s ability to lock one.
   *
   * The body is optional all the way down (`@RequestBody(required = false)`), so a decision with
   * no note sends nothing rather than `{}`.
   */
  approveAppeal: (appealId: number, payload?: AppealDecisionInput) =>
    api
      .post<Appeal>(`/v1/api/admin/moderation/appeals/${appealId}/approve`, payload)
      .then((r) => r.data),

  /** POST /v1/api/admin/moderation/appeals/{appealId}/reject — lets the sanction stand. */
  rejectAppeal: (appealId: number, payload?: AppealDecisionInput) =>
    api
      .post<Appeal>(`/v1/api/admin/moderation/appeals/${appealId}/reject`, payload)
      .then((r) => r.data),

  /**
   * ─── THE USER SIDE. Not `/admin/**`, so these three are the only moderation calls an ordinary
   * account may make, and `SecurityConfig`'s URL gate does not apply to them.
   */

  /**
   * GET /v1/api/moderation/my-violations — what has been recorded against the caller.
   *
   * `appealPending` on each row is what stops a second appeal for the same violation: the backend
   * rejects a duplicate, so the row itself carries the reason the button is gone.
   */
  getMyViolations: () =>
    api.get<UserViolation[]>('/v1/api/moderation/my-violations').then((r) => r.data),

  /** GET /v1/api/moderation/appeals — the caller's own appeals and their decisions. */
  getMyAppeals: () => api.get<Appeal[]>('/v1/api/moderation/appeals').then((r) => r.data),

  /** POST /v1/api/moderation/appeals — 201 with the created appeal. */
  submitAppeal: (payload: AppealInput) =>
    api.post<Appeal>('/v1/api/moderation/appeals', payload).then((r) => r.data),
};
