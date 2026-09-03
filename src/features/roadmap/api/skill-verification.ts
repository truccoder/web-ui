import api from '@/core/api/axios';
import type {
  PendingVerification,
  RoadmapProgress,
  SkillVerificationInput,
} from '../types/roadmap';

/**
 * `SkillVerificationController` (`/v1/api/skills`) — 4 endpoints, 4 functions.
 *
 * THREE OF THESE FOUR ARE MEANT TO BE MODERATOR-ONLY AND CURRENTLY ARE NOT — same defect as the
 * roadmap writes, same measurement: `@PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")` is inert
 * because method security is never enabled, and a plain seed user reading `/skills/pending` got
 * **200**. Raised as B20. Typed and gated here as the moderator operations they are meant to be.
 *
 * READING PROGRESS BACK IS SOLVED NOW (B21 closed): `GET /users/{userId}/roadmap-progress`
 * exists, and `submitVerification` returns the resulting row rather than `void` — so a node can be
 * rendered as verified / pending / rejected and the immediate outcome of a claim is visible.
 * Re-submitting still silently overwrites the existing row (`findByUserIdAndNodeId` then `save`),
 * so there is nothing to warn the user about there. Do not simulate anything with client-side
 * state — that is the `acceptedInSession` mistake this project already made once and undid.
 */
export const skillVerificationApi = {
  /**
   * POST /v1/api/skills/verify — claim a node, backed by one of four tiers.
   *
   * RETURNS THE RESULTING PROGRESS ROW (`RoadmapProgressDto` — `{nodeId, nodeName, tier, status,
   * verifiedAt}`), which is what makes the outcome visible. The four tiers still do different
   * things behind the one call, and now `status` says which happened:
   *  - `SELF_VERIFIED`   → `VERIFIED` on the spot, and awards reputation (`ROADMAP_SELF_VERIFIED`);
   *  - `MOD_VERIFIED` / `QUIZ_VERIFIED` → `PENDING_APPROVAL`, waits for a moderator;
   *  - `AUTO_CERTIFIED`  → checked immediately and set `VERIFIED` **or `REJECTED`** right there —
   *    still answering 200, so a caller must read `status`, not assume approval.
   *
   * The DTO is the same public shape `GET /users/{id}/roadmap-progress` returns and deliberately
   * carries no `proofUrl`/`proofImageKey`, so it is safe to hand straight back to the submitter.
   *
   * `AUTO_CERTIFIED` DEPENDS ON THE GITHUB DOMAIN. `verifyViaExternalApi` accepts the proof only
   * when `proofUrl` starts with `https://github.com/{the user's linked github username}/`, read
   * from the `github` module's stored stats. No linked account, no `proofUrl`, or a URL under
   * someone else's name all come back `REJECTED` — now legible instead of silent.
   */
  submitVerification: (payload: SkillVerificationInput) =>
    api.post<RoadmapProgress>('/v1/api/skills/verify', payload).then((r) => r.data),

  /**
   * GET /v1/api/skills/pending — the moderator queue: every row in `PENDING_APPROVAL`.
   *
   * Unpaginated and unfiltered — one query for the whole status, across all users and roadmaps.
   * Each row carries the requester's name and picture already (`findByStatusWithUserAndNode`
   * joins them), so rendering the queue needs no second lookup, which matters because there is no
   * public profile endpoint to do one with.
   */
  getPendingVerifications: () =>
    api.get<PendingVerification[]>('/v1/api/skills/pending').then((r) => r.data),

  /**
   * POST /v1/api/skills/{progressId}/approve — approve a pending claim.
   *
   * THE VERB AND THE PATH BOTH MOVED. This was `POST /v1/api/skills/approve/{progressId}`; the id
   * is now the resource and the action is the suffix, matching the project-wide
   * `POST /{resource}/{id}/{action}` rule (BE N2). Calling the old path answers 500 rather than
   * 404 — the backend does not map unknown paths (B19) — so a stale caller looks like a server
   * fault rather than a client mistake.
   *
   * ONLY A `PENDING_APPROVAL` ROW CAN BE APPROVED. Anything else answers **409 Conflict** with
   * "Cannot approve a verification request that is already VERIFIED" — measured, by approving the
   * same row twice. That matters because the queue is a shared list: two moderators acting on one
   * row means the second gets an error rather than a no-op, so the UI has to show it.
   *
   * Approving awards `ROADMAP_NODE_VERIFIED` reputation to the REQUESTER, not the moderator, and
   * stamps the moderator on the row as `verifier_id`.
   */
  approveVerification: (progressId: number) =>
    api.post<void>(`/v1/api/skills/${progressId}/approve`).then((r) => r.data),

  /**
   * POST /v1/api/skills/{progressId}/reject — reject a pending claim.
   *
   * Mirror of `approveVerification`, same moved path and same `PENDING_APPROVAL`-only rule. No
   * reputation is awarded or revoked; rejecting is not the inverse of approving, it is simply the
   * other terminal state. There is no reason field — the requester learns nothing beyond the
   * status they cannot currently read.
   */
  rejectVerification: (progressId: number) =>
    api.post<void>(`/v1/api/skills/${progressId}/reject`).then((r) => r.data),
};
