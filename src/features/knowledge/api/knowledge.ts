import api from '@/core/api/axios';
import type { Explanation, KnowledgeLibrary, SaveExplanationInput } from '../types/knowledge';

/**
 * `ExplanationController` (`/v1/api/knowledge`) — 3 endpoints, 3 functions.
 *
 * `KnowledgeSyncController` also lives under `/v1/api/knowledge`, but its two endpoints are
 * deliberately absent from this file — see the note at the bottom.
 */
export const explanationApi = {
  /**
   * POST /v1/api/knowledge/posts/{postId}/explain — ask the model to explain a post.
   *
   * **THIS COSTS REAL MONEY EVERY TIME IT IS CALLED.** `ExplanationService.explainPost` builds a
   * prompt and calls `geminiClient.generateContent`. It is the only read-shaped endpoint in the
   * whole app that bills per invocation, so it must never be retried automatically, never be
   * prefetched, and never sit behind a control that is easy to hit twice. The state layer wires it
   * as a mutation for exactly that reason.
   *
   * The post lookup happens BEFORE the model call, so a bad id is a plain 404 ("Post not found")
   * and costs nothing — measured. That is the one branch safe to exercise while testing.
   *
   * `feedbackNote` re-asks with a correction ("too advanced", "show me code"). The body is
   * `required = false` on the controller, so omitting it entirely is fine.
   *
   * NOTHING IS PERSISTED HERE. The result is returned and forgotten; `saveExplanation` is what puts
   * it in the library. So a generated explanation has no `id` until it is saved.
   */
  explainPost: (postId: number, feedbackNote?: string) =>
    api
      .post<Explanation>(`/v1/api/knowledge/posts/${postId}/explain`, { feedbackNote })
      .then((r) => r.data),

  /**
   * POST /v1/api/knowledge/save — keep an explanation in the library.
   *
   * `postId`, `originalContent` and `explanationContent` are `@NotNull`; a body missing them is a
   * **400** ("Malformed request body") rather than a 422, because the failure happens during
   * deserialization. Constraint violations on a well-formed body are 422 with a readable `details`
   * array — the same split measured in `bookstore` and `search`.
   */
  saveExplanation: (payload: SaveExplanationInput) =>
    api.post<Explanation>('/v1/api/knowledge/save', payload).then((r) => r.data),

  /**
   * GET /v1/api/knowledge/my-library — everything the signed-in user has saved.
   *
   * Unpaginated, and returns `{ explanations: [], totalCount: 0 }` for an empty library rather than
   * a 404 (measured), so `totalCount === 0` is the empty-state test.
   */
  getMyLibrary: () => api.get<KnowledgeLibrary>('/v1/api/knowledge/my-library').then((r) => r.data),

  /*
   * GET  /v1/api/knowledge/sync/pull  — DELIBERATELY NOT IMPLEMENTED
   * POST /v1/api/knowledge/sync/push  — DELIBERATELY NOT IMPLEMENTED
   *
   * These two authenticate with a PERSONAL ACCESS TOKEN, not the session JWT. `SecurityConfig`
   * leaves `/v1/api/knowledge/sync/**` on `permitAll` and the controller reads the `Authorization`
   * header itself, handing it to `PersonalAccessTokenService.validateToken`. Measured: the session
   * JWT is rejected outright —
   *
   *     GET /knowledge/sync/pull  Authorization: Bearer <session JWT>  →  404 "Invalid token"
   *     GET /knowledge/sync/pull  (no header)                          →  400 "Missing required header"
   *     GET /knowledge/sync/pull  Authorization: Bearer sk_7tDWi2…     →  200
   *
   * They exist for an external Obsidian-vault client, and the DTOs say so (`VaultNoteDto`,
   * `VaultPushRequestDto`). For the browser to call them it would have to hold a long-lived PAT in
   * localStorage — a stronger, longer-lived secret than the JWT it already has — in order to fetch
   * data that `getMyLibrary` already returns with the session it already has. The omission is the
   * correct implementation, not a gap.
   *
   * The frontend's role in the vault flow is issuing and revoking the tokens (`tokenApi`), not
   * syncing. Counted at Phase 4.7 alongside `POST /payments/momo/webhook` and
   * `GET /events/google/callback` as endpoints with no frontend consumer by design.
   */
};
