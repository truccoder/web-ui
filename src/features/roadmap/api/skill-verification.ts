import api from '@/core/api/axios';
import type { PendingVerification, SkillVerificationInput } from '../types/roadmap';

/**
 * `SkillVerificationController` (`/v1/api/skills`) — 4 endpoints, 4 functions.
 *
 * THREE OF THESE FOUR ARE MEANT TO BE MODERATOR-ONLY AND CURRENTLY ARE NOT — same defect as the
 * roadmap writes, same measurement: `@PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")` is inert
 * because method security is never enabled, and a plain seed user reading `/skills/pending` got
 * **200**. Raised as B20. Typed and gated here as the moderator operations they are meant to be.
 *
 * THERE IS NO ENDPOINT TO READ YOUR OWN PROGRESS, and that is the shape of this whole domain.
 * `UserRoadmapProgressRepository.findByUserId` exists and no controller calls it, so a user can
 * submit a claim on a node and then has no way to ask what became of it. Consequences the UI
 * layers have to be built around, not worked around:
 *  - a node cannot be rendered as "verified" / "pending" / "rejected" for the signed-in user;
 *  - `submitVerification` returning `void` means even the immediate outcome is invisible;
 *  - re-submitting is the only way to change a claim, and it silently overwrites the existing
 *    row (`findByUserIdAndNodeId` then `save`), so there is nothing to warn the user about.
 * Raised as B21. Do not simulate the missing read with client-side state — that is the
 * `acceptedInSession` mistake this project already made once and spent a checkpoint undoing.
 */
export const skillVerificationApi = {
  /**
   * POST /v1/api/skills/verify — claim a node, backed by one of four tiers.
   *
   * RETURNS `void`, AND THE FOUR TIERS DO COMPLETELY DIFFERENT THINGS. `submitVerificationRequest`
   * branches on `tier` and the caller is told none of it:
   *  - `SELF_VERIFIED`   → immediately VERIFIED, and awards reputation (`ROADMAP_SELF_VERIFIED`);
   *  - `MOD_VERIFIED` / `QUIZ_VERIFIED` → PENDING_APPROVAL, waits for a moderator;
   *  - `AUTO_CERTIFIED`  → checked on the spot and set VERIFIED **or REJECTED** right there.
   *
   * So a 200 does not mean "accepted" — an `AUTO_CERTIFIED` submission that failed its check is
   * also a 200, with a rejected row behind it and no way to read that back (see the note above).
   * A UI must not report success as approval.
   *
   * `AUTO_CERTIFIED` DEPENDS ON THE GITHUB DOMAIN. `verifyViaExternalApi` accepts the proof only
   * when `proofUrl` starts with `https://github.com/{the user's linked github username}/`, read
   * from the `github` module's stored stats. No linked account, no `proofUrl`, or a URL under
   * someone else's name all fail — silently, per the above. That coupling is real and belongs in
   * the UI layer through `features/github`'s barrel, not re-implemented here.
   */
  submitVerification: (payload: SkillVerificationInput) =>
    api.post<void>('/v1/api/skills/verify', payload).then((r) => r.data),

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
