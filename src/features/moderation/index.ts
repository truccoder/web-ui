/**
 * `features/moderation` — public surface. BE package `com.socialapp.moderation`.
 *
 * One controller, four endpoints: the review queue, the raw log search, the banned-user list, and
 * the decision itself.
 *
 * THE ONLY ADMIN DOMAIN IN THIS PROJECT WHOSE BACKEND GATE ACTUALLY HOLDS. `/v1/api/admin/**` is
 * matched by `SecurityConfig` and requires `hasRole("ADMIN")` — URL-level rules being the half of
 * Spring Security this backend enables. `features/roadmap` is the opposite case (B20: five
 * endpoints annotated with `@PreAuthorize` that never runs), and confusing the two would lead
 * someone to weaken this one to match.
 *
 * TWO THINGS A CONSUMER MUST NOT GET WRONG, both documented at their definitions:
 *  - **`decision` looks like a six-point scale and is a yes/no.** `reviewPost` reduces it to
 *    `isAtLeast(LIKELY)` and stores only the outcome.
 *  - **Rejecting can ban the author.** It records a violation, two violations mean a seven-day
 *    ban, and that ban blocks login. The reason is always filed as `HATE_SPEECH` regardless of
 *    what the post did (B22).
 *
 * Populated at P2.15ab with types + api + hooks. UI and wiring follow at P2.15cd, which is also
 * where the legacy `src/components/moderation/` is deleted.
 */

export { moderationApi } from './api';

export {
  ReportPostDialog,
  type ReportPostDialogProps,
  ModerationFilters,
  type ModerationFiltersProps,
  ModerationPostsTab,
  type ModerationPostsTabProps,
  ModerationLogsTab,
  type ModerationLogsTabProps,
  BannedUsersTab,
  type BannedUsersTabProps,
  MyViolationsPanel,
  AppealsTab,
  type AppealsTabProps,
} from './components';

export {
  moderationKeys,
  useModerationPosts,
  useModerationLogs,
  useBannedUsers,
  useReviewPost,
  type ModerationMutationOptions,
  type ReviewPostVariables,
  useAppeals,
  useApproveAppeal,
  useRejectAppeal,
  type AppealDecisionVariables,
  useMyViolations,
  useMyAppeals,
  useSubmitAppeal,
  useReportPost,
} from './hooks';

export type {
  ModerationStatus,
  ViolationType,
  Likelihood,
  ModerationLog,
  PostModerationDetail,
  BannedUser,
  AdminReviewInput,
  ModerationSearchParams,
  PostModerationPage,
  ModerationLogPage,
  BannedUserPage,
} from './types';
