import api from '@/core/api/axios';
import type {
  ApplyToPositionInput,
  CreatePositionInput,
  CreateProjectInput,
  JobDescriptionUrl,
  Project,
  ProjectApplication,
  ProjectMember,
  ProjectPage,
  ProjectPosition,
  ProjectStatus,
  SuggestedCandidate,
  SuggestedProject,
  UpdatePositionInput,
  UpdateProjectInput,
} from '../types/matchmaking';

/**
 * `ProjectController` (`/v1/api/projects`) — one call per endpoint.
 *
 * THE WARNING THAT USED TO OPEN THIS FILE IS DEAD, and it is quoted here because it explains why
 * the domain sat unbuilt for so long: "FOUR OF THESE FIVE FUNCTIONS NEED AN ID THAT NO ENDPOINT
 * CAN PRODUCE. There is no list of projects, no list of positions, and no list of applications."
 *
 * All three lists exist now, and `createProject` returns the created project with its id instead
 * of `void`. So every id these calls need has a source, and the screens that were impossible are
 * ordinary.
 *
 * PROJECT MANAGEMENT LANDED SEPARATELY (BE `task/E4rkd1nF`): the owner can now edit the project,
 * move its status (`OPEN ↔ CLOSED → COMPLETED`, the last step one-way), manage positions one at a
 * time, read the team roster and remove a member; an applicant can withdraw a `PENDING`
 * application. Ownership is checked in `ProjectService`, not in `SecurityConfig` — every
 * `/v1/api/projects/**` call only needs a session — so these are gated on the client by comparing
 * `authorId` to the signed-in id, the same way `getProjectApplications` already is.
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
   * NOW A REAL RANKING (BE `ecc53bb`, B26). It used to answer 500 on every call (B24: a native
   * query missing its schema qualifier), and once fixed it was still "shares at least one skill"
   * with no order. Both are stale: the backend scores each candidate against the position's
   * required skills (`ProfileMatchScorer`) and returns `matchScore` + `matchedSkills` sorted
   * best-first, so this is a leaderboard now, not a shortlist.
   *
   * A position with no `requiredSkills` still returns `[]` without querying.
   */
  getSuggestedCandidates: (positionId: number, limit = 10) =>
    api
      .get<SuggestedCandidate[]>(`/v1/api/projects/positions/${positionId}/suggested-candidates`, {
        params: { limit },
      })
      .then((r) => r.data),

  /**
   * GET /v1/api/projects/suggested — projects ranked against the caller's own professional
   * profile (BE `ecc53bb`, new). The mirror image of `getSuggestedCandidates`: there, a project
   * owner sees people who fit a role; here, a person sees projects that fit them.
   *
   * `[]` IS A NORMAL ANSWER, NOT AN ERROR, and it is common: `MatchmakingService.suggestProjects`
   * returns it outright for a caller with no professional profile row at all, and separately
   * drops any project that scores 0 once profiles exist — a project already applied to, or
   * belonging to someone in the caller's block set, is filtered out before scoring even runs. The
   * list is also already sorted best-first; do not re-sort by `matchScore` on this side.
   */
  getSuggestedProjects: (limit = 10) =>
    api
      .get<SuggestedProject[]>('/v1/api/projects/suggested', { params: { limit } })
      .then((r) => r.data),

  /**
   * PUT /v1/api/projects/{projectId} — edit title/description/banner/tags (not positions).
   *
   * Owner only, and **409 when the project is `COMPLETED`** — a finished project is frozen.
   */
  updateProject: (projectId: number, payload: UpdateProjectInput) =>
    api.put<Project>(`/v1/api/projects/${projectId}`, payload).then((r) => r.data),

  /**
   * PATCH /v1/api/projects/{projectId}/status.
   *
   * `OPEN ↔ CLOSED` is free; `→ COMPLETED` is ONE-WAY (409 on any move out of `COMPLETED`);
   * setting the current status again is a no-op. `CLOSED`/`COMPLETED` also stop new applications.
   */
  updateProjectStatus: (projectId: number, status: ProjectStatus) =>
    api.patch<Project>(`/v1/api/projects/${projectId}/status`, { status }).then((r) => r.data),

  /**
   * DELETE /v1/api/projects/{projectId} — hard delete (cascades positions + applications).
   *
   * Revokes the `PROJECT_APPLICATION_ACCEPTED` reputation of every `ACCEPTED` member first. There
   * is no undo, which is why the UI puts it behind a confirm that names the consequence.
   */
  deleteProject: (projectId: number) =>
    api.delete<void>(`/v1/api/projects/${projectId}`).then((r) => r.data),

  /**
   * POST /v1/api/projects/{projectId}/positions — add a role after creation (201).
   *
   * `quantity` defaults to 1. 409 when the project is `COMPLETED`.
   */
  addPosition: (projectId: number, payload: CreatePositionInput) =>
    api
      .post<ProjectPosition>(`/v1/api/projects/${projectId}/positions`, payload)
      .then((r) => r.data),

  /**
   * PUT /v1/api/projects/positions/{positionId} — edit a role.
   *
   * A null `quantity` keeps the current one. 409 when `quantity` is below the seats already
   * `ACCEPTED`. The backend reconciles status on its own: raising `quantity` on a `FILLED` role
   * reopens it, lowering it to exactly the accepted count fills an `OPEN` one.
   */
  updatePosition: (positionId: number, payload: UpdatePositionInput) =>
    api
      .put<ProjectPosition>(`/v1/api/projects/positions/${positionId}`, payload)
      .then((r) => r.data),

  /**
   * PATCH /v1/api/projects/positions/{positionId}/status — `OPEN ↔ CLOSED` only.
   *
   * `FILLED` cannot be set by hand (400), and reopening a role that is full answers 409.
   */
  updatePositionStatus: (positionId: number, status: 'OPEN' | 'CLOSED') =>
    api
      .patch<ProjectPosition>(`/v1/api/projects/positions/${positionId}/status`, { status })
      .then((r) => r.data),

  /**
   * DELETE /v1/api/projects/positions/{positionId} — 204.
   *
   * 409 while any member is still `ACCEPTED` on it; `PENDING`/`REJECTED`/`REMOVED` applications
   * are deleted along with it.
   */
  deletePosition: (positionId: number) =>
    api.delete<void>(`/v1/api/projects/positions/${positionId}`).then((r) => r.data),

  /**
   * GET /v1/api/projects/{projectId}/members — the team roster, built from `ACCEPTED`
   * applications. Any signed-in user may read it; 404 if the project does not exist.
   */
  getProjectMembers: (projectId: number) =>
    api.get<ProjectMember[]>(`/v1/api/projects/${projectId}/members`).then((r) => r.data),

  /**
   * GET /v1/api/projects/positions/{positionId}/job-description — a 24-hour presigned URL for the
   * role's generated JD PDF, plus its `renderedAt` (BE `V105`, `task/Ei3AfDgd`).
   *
   * SAME CONTRACT AS `bookApi.getPreviewUrl`: no side effect worth gating, cheap to re-sign, so a
   * plain query. Only call it for a position whose `hasJobDescription` is true — a role from before
   * V105 has no content and the endpoint would build a near-blank PDF.
   *
   * THE FIRST READ OF A ROLE IS SLOW (~1s): the backend renders the PDF before it signs. **503**
   * when the `job-descriptions` bucket is missing (a fresh dev environment needs `docker compose
   * up` once for `minio-init` to create it) — treat it as "this role's PDF storage is broken", the
   * same way `getBook` treats its own 503.
   */
  getJobDescriptionUrl: (positionId: number) =>
    api
      .get<JobDescriptionUrl>(`/v1/api/projects/positions/${positionId}/job-description`)
      .then((r) => r.data),

  /**
   * DELETE /v1/api/projects/{projectId}/members/{userId} — 204.
   *
   * Removes the person from EVERY position they hold: each application becomes `REMOVED`, their
   * `PROJECT_APPLICATION_ACCEPTED` reputation is revoked, and a freed seat reopens a `FILLED`
   * role. 404 if they are not a member. Owner only.
   */
  removeMember: (projectId: number, userId: number) =>
    api.delete<void>(`/v1/api/projects/${projectId}/members/${userId}`).then((r) => r.data),

  /**
   * DELETE /v1/api/projects/applications/{applicationId} — the applicant withdraws their own
   * application. 403 if it is not theirs; **409 once the owner has acted on it** (only a
   * `PENDING` application can be withdrawn). Hard delete.
   */
  withdrawApplication: (applicationId: number) =>
    api.delete<void>(`/v1/api/projects/applications/${applicationId}`).then((r) => r.data),
};
