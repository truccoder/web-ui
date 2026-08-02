import api from '@/core/api/axios';
import type {
  ApplyToPositionInput,
  CreateProjectInput,
  SuggestedCandidate,
} from '../types/matchmaking';

/**
 * `ProjectController` (`/v1/api/projects`) — 5 endpoints, 5 functions.
 *
 * READ THIS BEFORE BUILDING ANYTHING ON TOP: FOUR OF THESE FIVE FUNCTIONS NEED AN ID THAT NO
 * ENDPOINT CAN PRODUCE. There is no list of projects, no list of positions, and no list of
 * applications — not in this controller and not anywhere else in the API. The repositories do not
 * even contain unused finders to expose (unlike `roadmap`, where `findByUserId` existed and was
 * simply not wired up). So:
 *
 *  - `createProject` answers `void`. The service builds and returns a `ProjectEntity` with its id
 *    and its positions' ids — and the controller throws it away. The creator cannot learn what
 *    they just made.
 *  - `applyToPosition`, `getSuggestedCandidates` need a `positionId`; nothing hands one out.
 *  - `acceptApplication`, `rejectApplication` need an `applicationId`; nothing hands one out.
 *
 * Measured at 2ab: creating a project answered 200 with an empty body, and the resulting
 * project/position ids were only visible by querying Postgres directly.
 *
 * These functions are written and typed anyway — the endpoints are real and their contracts are
 * settled, so when the backend adds the reads (B24) nothing here changes. What cannot be built on
 * them yet is a screen.
 */
export const matchmakingApi = {
  /**
   * POST /v1/api/projects — create a project together with all of its positions.
   *
   * ONE SHOT, NO FOLLOW-UP. There is no endpoint to add, edit or remove a position afterwards, so
   * the `positions` array sent here is permanent. `title` and `description` are `@NotBlank`;
   * each position's `title` is too, and `quantity` is `@Min(1)`.
   *
   * Returns nothing — see the file note. A caller cannot confirm the result or link to it.
   */
  createProject: (payload: CreateProjectInput) =>
    api.post<void>('/v1/api/projects', payload).then((r) => r.data),

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
   * **THIS ENDPOINT IS CURRENTLY BROKEN AND ANSWERS 500 EVERY TIME.** `findBySkillsMatch` is the
   * one native query in the backend, and it names the table without its schema —
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
