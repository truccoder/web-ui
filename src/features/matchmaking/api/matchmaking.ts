import api from '@/core/api/axios';
import type {
  ApplyToPositionInput,
  CreateProjectInput,
  Project,
  ProjectApplication,
  ProjectPage,
  SuggestedCandidate,
} from '../types/matchmaking';

/**
 * `ProjectController` (`/v1/api/projects`) — 9 endpoints, 9 functions.
 *
 * THE WARNING THAT USED TO OPEN THIS FILE IS DEAD, and it is quoted here because it explains why
 * the domain sat unbuilt for so long: "FOUR OF THESE FIVE FUNCTIONS NEED AN ID THAT NO ENDPOINT
 * CAN PRODUCE. There is no list of projects, no list of positions, and no list of applications."
 *
 * All three lists exist now, and `createProject` returns the created project with its id instead
 * of `void`. So every id these calls need has a source, and the screens that were impossible are
 * ordinary.
 *
 * ONE PATH DETAIL WORTH NOT BREAKING: the detail and inbox routes are declared `{projectId:\d+}`
 * server-side so that `/projects/applications` routes to the literal sibling rather than trying to
 * bind "applications" as an id. Nothing on this side depends on it, but a caller that sends a
 * non-numeric id gets a 404 from the router rather than a 400 from the handler.
 */
export const matchmakingApi = {
  /** GET /v1/api/projects — browse, newest first. Cursor paging; `hasMore` is the only total. */
  getProjects: (cursor?: number, limit = 10) =>
    api.get<ProjectPage>('/v1/api/projects', { params: { cursor, limit } }).then((r) => r.data),

  /** GET /v1/api/projects/{projectId} — one project with its positions. */
  getProject: (projectId: number) =>
    api.get<Project>(`/v1/api/projects/${projectId}`).then((r) => r.data),

  /**
   * GET /v1/api/projects/{projectId}/applications — the owner's inbox.
   *
   * **403 FOR ANYONE ELSE**, which makes this the one read in the domain that is a permission
   * boundary rather than a query. A screen must not call it speculatively to find out whether the
   * viewer owns the project — compare `authorId` to the signed-in id instead.
   */
  getProjectApplications: (projectId: number) =>
    api.get<ProjectApplication[]>(`/v1/api/projects/${projectId}/applications`).then((r) => r.data),

  /** GET /v1/api/projects/applications/mine — what the caller has applied to. */
  getMyApplications: () =>
    api.get<ProjectApplication[]>('/v1/api/projects/applications/mine').then((r) => r.data),

  /**
   * POST /v1/api/projects — create a project together with all of its positions.
   *
   * ONE SHOT, NO FOLLOW-UP. There is no endpoint to add, edit or remove a position afterwards, so
   * the `positions` array sent here is permanent. `title` and `description` are `@NotBlank`;
   * each position's `title` is too, and `quantity` is `@Min(1)`.
   *
   * RETURNS THE CREATED PROJECT (201), ids included — it used to answer `void` and discard them.
   * That single change is what makes "create, then open what you made" possible.
   */
  createProject: (payload: CreateProjectInput) =>
    api.post<Project>('/v1/api/projects', payload).then((r) => r.data),

  /**
   * POST /v1/api/projects/positions/{positionId}/apply.
   *
   * Refuses with an error when the position is not `OPEN` — `applyToPosition` throws
   * "Position is not open for applications", which the project's handler turns into a 409 the way
   * the equivalent state guards do in `roadmap` and `moderation`.
   *
   * `message` has no validation, so an empty application is accepted server-side.
   */
  applyToPosition: (positionId: number, payload: ApplyToPositionInput) =>
    api.post<void>(`/v1/api/projects/positions/${positionId}/apply`, payload).then((r) => r.data),

  /**
   * POST /v1/api/projects/applications/{applicationId}/accept — owner accepts an applicant.
   *
   * THE VERB MOVED: this was `PUT`, and is `POST` since the project-wide switch to
   * `POST /{resource}/{id}/{action}` (BE N2). Confirmed against the live spec.
   *
   * Only the project's owner may call it, and the position row is locked for the transaction
   * (`findByIdForUpdate`) so two concurrent accepts cannot both slip past the quantity check.
   * That lock is the backend being careful, not something a caller can observe — but it does mean
   * an accept can legitimately fail because someone else filled the last slot first.
   */
  acceptApplication: (applicationId: number) =>
    api.post<void>(`/v1/api/projects/applications/${applicationId}/accept`).then((r) => r.data),

  /** POST /v1/api/projects/applications/{applicationId}/reject — same verb change as accept. */
  rejectApplication: (applicationId: number) =>
    api.post<void>(`/v1/api/projects/applications/${applicationId}/reject`).then((r) => r.data),

  /**
   * GET /v1/api/projects/positions/{positionId}/suggested-candidates.
   *
   * IT USED TO ANSWER 500 EVERY TIME — measure before trusting it. `findBySkillsMatch` is the
   * one native query in the backend, and it named the table without its schema —
   * `SELECT * FROM t_user_professional_profiles`, while the table is
   * `socialapp.t_user_professional_profiles`. Measured at 2ab:
   * `relation "t_user_professional_profiles" does not exist`. Every other repository uses JPQL,
   * which resolves the schema through the entity mapping, so this is the only query with the
   * problem. Raised as B24.
   *
   * When it works: a position with no `requiredSkills` returns `[]` without querying, and matching
   * is a plain "shares at least one skill" — there is no ranking, no score and no ordering, so the
   * result is a shortlist rather than a leaderboard and must not be presented as one.
   */
  getSuggestedCandidates: (positionId: number) =>
    api
      .get<SuggestedCandidate[]>(`/v1/api/projects/positions/${positionId}/suggested-candidates`)
      .then((r) => r.data),
};
