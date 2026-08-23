/**
 * `features/matchmaking` — public surface. BE package `com.socialapp.matchmaking`.
 *
 * One controller, nine endpoints: browse projects, read one project with its positions, the
 * owner's application inbox, the applicant's own applications, create a project (with its
 * positions), apply to a position, accept an application, reject an application, and the candidate
 * shortlist for a position.
 *
 * THE BLOCKER THIS MODULE CARRIED FOR ITS WHOLE LIFE IS GONE, and the old note is worth keeping in
 * view because it is the reason a complete data layer sat here with no screens since P2.16ab:
 *
 *  1. "**Nothing lists anything.** No endpoint returns projects, positions or applications … So
 *     the `positionId` and `applicationId` that four of the five endpoints require cannot be
 *     obtained from the API." → `GET /projects`, `GET /projects/{id}`,
 *     `GET /projects/{id}/applications` and `GET /projects/applications/mine` all exist now, and
 *     every id is reachable.
 *  2. "**`createProject` discards the ids it has.**" → it answers `201` with the created
 *     `ProjectResponseDto`, ids included. The backend's javadoc records the fix in as many words:
 *     "this method threw it away, so a client had no way to navigate to what it had just created".
 *  3. "**The one read endpoint answers 500.**" → the schema-qualifier bug was in
 *     `findBySkillsMatch`; consumers should still treat `isError` on the shortlist as a normal
 *     outcome rather than assume it is fixed everywhere.
 *
 * `SuggestedCandidate` IS NARROW ON PURPOSE, not by accident: the backend deliberately withholds
 * work history, explanation style and interested domains from a project owner. Do not try to
 * enrich it.
 *
 * ONE GAP REMAINS AND IT IS NOT THIS MODULE'S TO FIX: `ProjectResponseDto` has `authorId` and
 * `authorFullName` but **no `authorUsername`**, so a project's author cannot link to
 * `/u/{username}` — the same missing field that keeps feed authors unlinked (B28).
 */

export { matchmakingApi } from './api';

export {
  ProjectList,
  ProjectCard,
  ProjectDetail,
  type ProjectDetailProps,
  MyApplications,
  CreateProjectDialog,
  type CreateProjectDialogProps,
} from './components';

export {
  matchmakingKeys,
  useProjects,
  useProject,
  useProjectApplications,
  useMyApplications,
  useSuggestedCandidates,
  useCreateProject,
  useApplyToPosition,
  useAcceptApplication,
  useRejectApplication,
  type MatchmakingMutationOptions,
  type ApplyToPositionVariables,
} from './hooks';

export type {
  SeniorityLevel,
  PrimaryRole,
  SuggestedCandidate,
  CreatePositionInput,
  CreateProjectInput,
  ApplyToPositionInput,
  Project,
  ProjectPosition,
  ProjectPage,
  ProjectApplication,
  ProjectStatus,
  PositionStatus,
  ApplicationStatus,
} from './types';
