import api from '@/core/api/axios';
import { liftExplanationEnvelope } from '../lib/explanation-envelope';
import type { Explanation, SavedExplanations, SaveExplanationInput } from '../types/knowledge';

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
   * `language` IS A BCP-47 TAG AND THE FRONTEND WAS NOT SENDING IT. `ExplainRequestDto` has carried
   * the field since the backend fixed the mixed-language card: without it the prompt's only
   * instruction is "respond in the same language as the original post", which produced a Vietnamese
   * post explained in English underneath Vietnamese section labels. The endpoint does not read
   * `Accept-Language`, so this parameter is the only channel — see `useExplainPost`, which fills it
   * from the app's own locale so no caller can forget.
   *
   * The value is validated server-side against `^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$` and then
   * resolved through `Locale` before it reaches the prompt, because it is concatenated into one.
   *
   * NOTHING IS PERSISTED HERE. The result is returned and forgotten; `saveExplanation` is what puts
   * it in the library. So a generated explanation has no `id` until it is saved.
   *
   * NO `liftExplanationEnvelope` HERE ANY MORE (B40). The backend used to fall back to returning
   * Gemini's raw JSON envelope as `explanationContent` when it could not deserialize it;
   * `ExplanationService` now strips the fence, trims to the outermost braces, asks the model to
   * repair its own output once, and answers 503 rather than handing back an envelope. A fresh
   * explanation can no longer arrive wrapped, so the salvage is applied only in `getMyLibrary`,
   * where rows saved while the bug was live still carry the raw string.
   */
  explainPost: (
    postId: number,
    feedbackNote?: string,
    language?: string,
    useVaultContext?: boolean
  ) =>
    api
      .post<Explanation>(`/v1/api/knowledge/posts/${postId}/explain`, {
        feedbackNote,
        language,
        useVaultContext,
      })
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
   *
   * `liftExplanationEnvelope` IS THE LAST CONSUMER OF THE B40 SALVAGE. The backend no longer
   * produces raw-JSON envelopes, but rows saved while that bug was live still hold one in
   * `explanationContent` and nothing rewrites them — this keeps those entries readable. No-op on
   * every well-formed row, so it comes out once the old data is gone.
   */
  getMyLibrary: () =>
    api.get<SavedExplanations>('/v1/api/knowledge/my-library').then((r) => ({
      ...r.data,
      explanations: (r.data.explanations ?? []).map(liftExplanationEnvelope),
    })),

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
   * The frontend's role in the vault flow is issuing and revoking the tokens (`tokenApi`) and
   * letting the owner read and delete what was synced (`vaultApi`, added 28/08 against the new
   * session-authenticated `/knowledge/vault/**` endpoints) — never the syncing itself. Counted at
   * Phase 4.7 alongside `POST /payments/momo/webhook` and `GET /events/google/callback` as
   * endpoints with no frontend consumer by design.
   */
};
