import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for the `com.socialapp.knowledge` package, derived from `schema.gen.ts`.
 *
 * FOUR controllers, 10 endpoints, and two of the four have paths that read like they belong to
 * `security`: `PersonalAccessTokenController` serves `/v1/api/tokens` and
 * `ProfessionalProfileController` serves `/v1/api/profile/professional`. Feature boundaries mirror
 * BE package boundaries 1:1 (CLAUDE.md §4), so both live here. That is the deliberate oddity the
 * ledger's boundary note records — do not "fix" it by moving them next to `/profile/me`.
 *
 * The domain is really two halves that share a package: an AI explanation feature over posts, and
 * the credential plumbing for an external Obsidian-vault client. `docs/ledger/findings/knowledge.md`
 * has the measured shapes.
 */

/** How the explainer should pitch its answer. Stored on the profile, not passed per request. */
export type ExplanationStyle = NonNullable<
  Schemas['UpdateProfessionalProfileDto']['explanationStyle']
>;

/** Broad discipline. Nine values — `OTHER` is real, not a placeholder. */
export type PrimaryRole = NonNullable<Schemas['UpdateProfessionalProfileDto']['primaryRole']>;

/** `seniorityLevel` is the one required field on the update DTO. */
export type SeniorityLevel = NonNullable<Schemas['UpdateProfessionalProfileDto']['seniorityLevel']>;

/** What a personal access token is allowed to do — see `CreateTokenInput` for the naming trap. */
export type VaultPermission = NonNullable<Schemas['CreateTokenRequestDto']['vaultPermission']>;

/** One row of work history. Every field optional on the wire; the form decides what it requires. */
export type WorkExperience = {
  [K in keyof Required<Schemas['WorkExperience']>]: Required<Schemas['WorkExperience']>[K] | null;
};

/**
 * The signed-in user's professional profile.
 *
 * THE BACKEND RETURNS A RAW JPA ENTITY HERE, not a DTO — `ProfessionalProfileController` is typed
 * `UserProfessionalProfileEntity`. Same shape of problem as `/attendees` in `posts`: the persistence
 * model is the API contract, so any column rename is a breaking change nobody planned. Recorded
 * rather than worked around; the generated type is still the truth about what arrives.
 *
 * `GET` **404s when no profile exists** — it is `findById().orElseThrow`, not a get-or-create. That
 * is the opposite of `GET /notifications/preferences`, which silently inserts a default row. So a
 * 404 on this endpoint means "not set up yet", not "something went wrong", and the UI needs a real
 * empty state. `PUT` is what creates it (`upsertProfile`).
 */
export type ProfessionalProfile = {
  [K in keyof Required<Schemas['UserProfessionalProfileEntity']>]: K extends 'workHistory'
    ? WorkExperience[] | null
    : Required<Schemas['UserProfessionalProfileEntity']>[K] | null;
};

/**
 * Body for `PUT /v1/api/profile/professional`.
 *
 * EVERY KEY IS REQUIRED HERE EVEN THOUGH THE BACKEND MARKS THEM OPTIONAL, because the endpoint is a
 * FULL REPLACE and the missing ones are silently destroyed. Measured: a request carrying only
 * `primaryRole`, `seniorityLevel` and `yearsOfExperience` came back with `jobTitle`,
 * `knownTechStack`, `workHistory` and `interestedDomains` all `null` — the previous values were
 * `"Backend Developer"` and `["Java","Spring Boot","PostgreSQL","Docker"]`.
 *
 * This is the same failure `PostEditorState` was tightened against at P2.4′c-4, and it is worth
 * repeating why the type carries the weight: the service copies nulls, and the DTO's optionality
 * means a caller that forgets a field still compiles. Making the keys mandatory turns a silent data
 * loss into a compile error. Values may still be `null` — that is a real choice to clear a field —
 * but the key must be present and considered.
 *
 * Do NOT reason from `PUT /notifications/preferences`, which wraps every field in
 * `Objects.nonNull(...)` and genuinely is a partial update. Two PUTs, opposite semantics.
 */
export type UpdateProfessionalProfileInput = {
  [K in keyof Required<Schemas['UpdateProfessionalProfileDto']>]: K extends 'seniorityLevel'
    ? SeniorityLevel
    : K extends 'workHistory'
      ? WorkExperience[] | null
      : Required<Schemas['UpdateProfessionalProfileDto']>[K] | null;
};

/**
 * A personal access token as it appears in the list — WITHOUT the secret.
 *
 * `GET /tokens` never returns `token`; only `POST /tokens` does, once. See `CreatedToken`.
 */
export type PersonalAccessToken = {
  [K in keyof Required<Schemas['PersonalAccessTokenResponseDto']>]:
    | Required<Schemas['PersonalAccessTokenResponseDto']>[K]
    | null;
};

/**
 * The response to creating a token — THE ONLY TIME THE SECRET IS EVER RETURNED.
 *
 * `token` (`sk_…`) appears in this response and nowhere else: the list endpoint omits the field
 * entirely, and there is no "reveal" endpoint. If the user navigates away without copying it, the
 * only recovery is to revoke and create another. That single fact is why creation gets its own
 * dialog instead of being a row in the list.
 */
export type CreatedToken = {
  [K in keyof Required<Schemas['CreateTokenResponseDto']>]:
    | Required<Schemas['CreateTokenResponseDto']>[K]
    | null;
};

/**
 * Body for `POST /v1/api/tokens`.
 *
 * `name` is `@NotBlank` — omitting it is a **422** carrying
 * `["Property name: must not be blank"]`.
 *
 * `vaultPermission` IS NAMED FROM THE VAULT'S POINT OF VIEW, WHICH READS BACKWARDS FROM THE APP'S.
 * `push` (the external client writing back into the app) requires `BIDIRECTIONAL`; a `WRITE_ONLY`
 * token is rejected with a 403. So `WRITE_ONLY` means "this token may only write *into the vault*",
 * i.e. pull-only as far as the app is concerned. The UI must describe the behaviour rather than
 * print the enum name, or every user will read it as the opposite of what it does.
 */
export type CreateTokenInput = {
  name: NonNullable<Schemas['CreateTokenRequestDto']['name']>;
  vaultPermission?: VaultPermission;
  /** Omit for the backend's default lifetime. */
  expiresInDays?: number;
};

/** One link the explainer suggested alongside its answer. */
export type ExternalLink = {
  [K in keyof Required<Schemas['ExternalLink']>]: Required<Schemas['ExternalLink']>[K] | null;
};

/**
 * One AI explanation of a post.
 *
 * The same shape comes back from generating (`/posts/{id}/explain`), saving (`/save`) and listing
 * (`/my-library`) — but a generated-and-unsaved one has no database row behind it, so treat `id` as
 * "saved yet?" rather than assuming it is always there.
 */
export type Explanation = {
  [K in keyof Required<Schemas['ExplanationResponseDto']>]: K extends 'externalLinks'
    ? ExternalLink[] | null
    : Required<Schemas['ExplanationResponseDto']>[K] | null;
};

/**
 * Everything the user has saved.
 *
 * NAMED `SavedExplanations` RATHER THAN `KnowledgeLibrary` because the component that renders it
 * owns that name — same resolution as `CommentThread` → `CommentWithReplies` in `posts`, where a
 * grouping type and a component collided. `totalCount` is a plain `int`, always present.
 */
export type SavedExplanations = {
  explanations: Explanation[];
  totalCount: NonNullable<Schemas['KnowledgeLibraryResponseDto']['totalCount']>;
};

/**
 * Body for `POST /v1/api/knowledge/save`.
 *
 * `postId`, `originalContent` and `explanationContent` are all `@NotNull`. Saving is a separate
 * call from generating on purpose — an explanation is shown first and kept only if the user asks,
 * so nothing reaches the library by accident.
 */
export type SaveExplanationInput = {
  postId: NonNullable<Schemas['SaveExplanationRequestDto']['postId']>;
  originalContent: NonNullable<Schemas['SaveExplanationRequestDto']['originalContent']>;
  explanationContent: NonNullable<Schemas['SaveExplanationRequestDto']['explanationContent']>;
  concepts?: string[];
  prerequisites?: string[];
  complexityScore?: number;
};
