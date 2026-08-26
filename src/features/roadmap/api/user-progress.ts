import api from '@/core/api/axios';
import type { RoadmapProgress } from '../types/roadmap';

/**
 * `UserRoadmapProgressController` (`/v1/api/users/{userId}/roadmap-progress`) — 1 endpoint.
 *
 * ITS OWN FILE RATHER THAN AN ADDITION TO `skill-verification.ts`, because that file's header
 * declares itself to be `SkillVerificationController` (`/v1/api/skills`) and a `/users/...` path
 * inside it would make the header a lie. Same service backs both (`SkillVerificationService`), but
 * the controller is the unit these files mirror.
 *
 * THIS IS THE THIRD CONTROLLER IN `com.socialapp.roadmap`, and the one whose path gives no hint of
 * that. The ledger's boundary-note convention exists for exactly this: mirror the package, record
 * the surprise, so a later reader does not "fix" it into `features/security`.
 *
 * IT CLOSES B21 — the ledger's open item was "repository method exists, controller missing".
 */
export const userProgressApi = {
  /**
   * GET /v1/api/users/{userId}/roadmap-progress — every node this user has claimed.
   *
   * KEYED BY ID, NOT BY HANDLE, unlike the new `/users/{username}/profile`. The backend's own note
   * is that a client resolves handle → id once and then uses the id for every section of a profile
   * page; this function is one of those sections.
   *
   * THE RESPONSE DEPENDS ON WHO IS ASKING. The service filters to `VERIFIED` rows unless the
   * viewer is the user themselves, so the owner also receives `PENDING_APPROVAL` and `REJECTED`.
   * There is no parameter for this and there should not be one — it is an authorisation decision,
   * and a flag here would only let a caller ask for something the server will refuse anyway.
   *
   * OPEN TO SIGNED-OUT VISITORS. The controller reads the viewer id with the non-throwing
   * accessor precisely so a guest gets the public subset rather than a 401, which means this is
   * safe to call from a surface that does not require a session.
   *
   * Unpaginated, and unsorted in any guaranteed way — the repository declares no `OrderBy`, the
   * same trap already recorded for `RoadmapNode.orderIndex`. Ordering is the consumer's job.
   */
  getRoadmapProgress: (userId: number) =>
    api.get<RoadmapProgress[]>(`/v1/api/users/${userId}/roadmap-progress`).then((r) => r.data),
};
