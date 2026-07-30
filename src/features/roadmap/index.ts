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
 * Populated at 2a with types + api. State (2b), UI (2c) and wiring (2d) follow.
 */

export { roadmapApi, skillVerificationApi } from './api';

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
