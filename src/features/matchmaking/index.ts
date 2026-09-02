/**
 * `features/matchmaking` — public surface. BE package `com.socialapp.matchmaking`.
 *
 * One controller, ELEVEN endpoints: browse projects, read one project with its positions, the
 * owner's application inbox, the applicant's own applications, create a project (with its
 * positions and now its `tags`), apply to a position, accept an application, reject an
 * application, ranked candidates for a position, and — new in B26 — projects ranked against the
 * caller's own professional profile.
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
 *     `findBySkillsMatch`, fixed at B24. B26 then closed the note that replaced it — "matching is
 *     shares-at-least-one-skill, no score, no order" — by adding a real `matchScore`: both
 *     `getSuggestedCandidates` and the new `getSuggestedProjects` return an already-sorted,
 *     best-match-first list.
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
  SuggestedProjects,
  ProjectDetail,
  type ProjectDetailProps,
  MyApplications,
  CreateProjectDialog,
  type CreateProjectDialogProps,
  EditProjectDialog,
  type EditProjectDialogProps,
  ProjectOwnerControls,
  type ProjectOwnerControlsProps,
  AddPositionButton,
  PositionOwnerControls,
  ProjectMembersSection,
  type ProjectMembersSectionProps,
} from './components';

export {
  matchmakingKeys,
  useProjects,
  useProject,
  useProjectApplications,
  useMyApplications,
  useProjectMembers,
  useSuggestedCandidates,
  useSuggestedProjects,
  useCreateProject,
  useApplyToPosition,
  useAcceptApplication,
  useRejectApplication,
  useUpdateProject,
  useUpdateProjectStatus,
  useDeleteProject,
  useAddPosition,
  useUpdatePosition,
  useUpdatePositionStatus,
  useDeletePosition,
  useRemoveMember,
  useWithdrawApplication,
  type MatchmakingMutationOptions,
  type ApplyToPositionVariables,
  type UpdateProjectVariables,
  type UpdateProjectStatusVariables,
  type AddPositionVariables,
  type UpdatePositionVariables,
  type UpdatePositionStatusVariables,
  type RemoveMemberVariables,
} from './hooks';

export type {
  SeniorityLevel,
  PrimaryRole,
  SuggestedCandidate,
  SuggestedProject,
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
  ProjectMember,
  UpdateProjectInput,
  UpdateProjectStatusInput,
  UpdatePositionInput,
  UpdatePositionStatusInput,
} from './types';
