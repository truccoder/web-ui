import api from '@/core/api/axios';
import type {
  CreatedToken,
  CreateTokenInput,
  PersonalAccessToken,
  ProfessionalProfile,
  UpdateProfessionalProfileInput,
} from '../types/knowledge';

/**
 * `ProfessionalProfileController` (`/v1/api/profile/professional`) — 2 endpoints, 2 functions.
 *
 * The path sits under `/profile`, but the controller is in the backend package
 * `com.socialapp.knowledge` and this profile exists to steer the AI explainer — which is why it
 * carries `explanationStyle` and `knownTechStack` rather than anything a social profile would.
 * Mirrored by package (CLAUDE.md §4); the account-level profile is `security`'s `/profile/me`.
 */
export const professionalProfileApi = {
  /**
   * GET /v1/api/profile/professional — the signed-in user's professional profile.
   *
   * **404 MEANS "NOT SET UP YET", NOT AN ERROR.** The service is
   * `findById().orElseThrow(NotFoundException)` — there is no get-or-create here, unlike
   * `GET /notifications/preferences`, which quietly inserts a default row and therefore never 404s.
   * Callers need a genuine empty state, and `updateProfile` is the only way one comes into
   * existence (`upsertProfile`).
   *
   * Returns the JPA entity directly rather than a DTO — noted on the `ProfessionalProfile` type.
   */
  getProfile: () =>
    api.get<ProfessionalProfile>('/v1/api/profile/professional').then((r) => r.data),

  /**
   * PUT /v1/api/profile/professional — create or replace the profile.
   *
   * **A FULL REPLACE. ANY FIELD YOU OMIT IS DESTROYED.** Measured on the running backend: a request
   * carrying only `primaryRole`, `seniorityLevel` and `yearsOfExperience` came back with
   * `jobTitle`, `knownTechStack`, `workHistory` and `interestedDomains` all set to `null`, wiping
   * `"Backend Developer"` and a four-entry tech stack.
   *
   * So callers MUST load the current profile and send it back whole. `UpdateProfessionalProfileInput`
   * makes every key mandatory to turn that obligation into a compile error rather than a silent
   * loss — the same tightening `PostEditorState` needed after the same class of bug in `posts`.
   *
   * Do not generalise from `PUT /notifications/preferences`: that one is a genuine partial update
   * because its service wraps every field in `Objects.nonNull(...)`. This one does not.
   *
   * `seniorityLevel` is `@NotNull`, so a partial update is impossible even in principle. An invalid
   * ENUM value is a **400** ("Malformed request body"); a constraint violation is a **422** whose
   * `details` array can carry SEVERAL messages at once — measured returning both
   * `"yearsOfExperience: must be greater than or equal to 0"` and
   * `"seniorityLevel: must not be null"` from one request.
   */
  updateProfile: (payload: UpdateProfessionalProfileInput) =>
    api.put<ProfessionalProfile>('/v1/api/profile/professional', payload).then((r) => r.data),
};

/**
 * `PersonalAccessTokenController` (`/v1/api/tokens`) — 3 endpoints, 3 functions.
 *
 * These tokens authenticate the external vault client against `/v1/api/knowledge/sync/**`. Issuing
 * and revoking them is the whole of the frontend's part in that flow; the syncing itself is not
 * ours to call (see `explanationApi`).
 */
export const tokenApi = {
  /**
   * POST /v1/api/tokens — mint a token.
   *
   * **THE ONLY TIME THE SECRET IS EVER RETURNED.** The response carries `token` (`sk_…`); the list
   * endpoint omits the field entirely and there is no reveal endpoint. A user who navigates away
   * without copying it has to revoke and mint another. Any UI built on this must show the value
   * immediately, say plainly that it will not be shown again, and offer a copy control.
   *
   * `name` is `@NotBlank` — omitting it is a **422** with
   * `["Property name: must not be blank"]`.
   *
   * On `vaultPermission`: the names read from the vault's side, not the app's — `WRITE_ONLY` is
   * pull-only as far as this backend is concerned. See `CreateTokenInput`.
   */
  createToken: (payload: CreateTokenInput) =>
    api.post<CreatedToken>('/v1/api/tokens', payload).then((r) => r.data),

  /**
   * GET /v1/api/tokens — the user's tokens, secrets excluded.
   *
   * Returns `[]` rather than 404 when there are none. `lastUsedAt` is null until the vault client
   * actually authenticates with it, which makes it the only signal that a token was ever used.
   */
  listTokens: () => api.get<PersonalAccessToken[]>('/v1/api/tokens').then((r) => r.data),

  /**
   * DELETE /v1/api/tokens/{tokenId} — revoke. Returns `void`.
   *
   * A missing id is a real **404** ("Token not found"), not a silent 200 — worth contrasting with
   * `markAsRead` in `notifications`, which swallows unknown ids. So the error branch here is
   * meaningful and should be surfaced rather than assumed away.
   */
  revokeToken: (tokenId: number) =>
    api.delete<void>(`/v1/api/tokens/${tokenId}`).then(() => undefined),
};
