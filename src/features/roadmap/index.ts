/**
 * `features/roadmap` — public surface. BE package `com.socialapp.roadmap`.
 *
 * TWO CONTROLLERS, EIGHT ENDPOINTS, ONE MODULE: `RoadmapController` (`/v1/api/roadmaps`, 4) and
 * `SkillVerificationController` (`/v1/api/skills`, 4). They share a package on the backend and a
 * subject here — a skill verification is a claim about one roadmap node — so CLAUDE.md §4 keeps
 * them in one folder behind one barrel, however unrelated the two URL prefixes look.
 *
 * WHAT THIS DOMAIN CANNOT DO, established at 2a by reading the Java rather than by guessing from
 * endpoint names. Both are hard limits on the UI, not gaps to paper over:
 *  - **A user cannot read their own progress.** Nothing exposes
 *    `UserRoadmapProgressRepository.findByUserId`, and `submitVerification` returns `void`. A
 *    node cannot be shown as verified/pending/rejected for the signed-in user (B21).
 *  - **The role gates do not work.** The five admin/moderator endpoints carry `@PreAuthorize`
 *    that never runs, because method security is not enabled backend-side (B20). The gate has to
 *    come from this app's own admin role until that is fixed.
 *
 * THE ADMIN GATE THIS BARREL EXPORTS IS NOT SECURITY. `useIsRoadmapAdmin` stops the app offering
 * authoring and moderation controls to everyone; it cannot stop anyone calling the endpoints,
 * because the backend does not gate them at all (B20). Treat it as honesty about intent, not as
 * enforcement.
 *
 * Populated at 2a with types + api and at 2b with hooks. UI (2c) and wiring (2d) follow.
 */

export { roadmapApi, skillVerificationApi } from './api';

export {
  RoadmapList,
  type RoadmapListProps,
  RoadmapNodeTree,
  type RoadmapNodeTreeProps,
  SkillVerificationForm,
  type SkillVerificationFormProps,
  PendingVerificationQueue,
  type PendingVerificationQueueProps,
  RoadmapAdminPanel,
  type RoadmapAdminPanelProps,
} from './components';

export {
  roadmapKeys,
  useIsRoadmapAdmin,
  useRoadmaps,
  useRoadmapNodes,
  useCreateRoadmap,
  useCreateRoadmapNode,
  usePendingVerifications,
  useSubmitVerification,
  useApproveVerification,
  useRejectVerification,
  type RoadmapMutationOptions,
  type CreateRoadmapNodeVariables,
} from './hooks';

export type {
  Roadmap,
  RoadmapNode,
  CreatedRoadmapNode,
  CreateRoadmapInput,
  CreateRoadmapNodeInput,
  SkillVerificationInput,
  PendingVerification,
  VerificationTier,
} from './types';
