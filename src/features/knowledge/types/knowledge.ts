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

/**
 * What a saved explanation is ABOUT — the topic the Archive filters by. BE `15090af`, V77.
 *
 * NOT THE SAME ENUM AS `PrimaryRole`, THOUGH SEVEN OF THE NINE NAMES MATCH, and the backend
 * matched them deliberately so that "suggest content for this person's role" is one day a name
 * comparison instead of a mapping table nobody maintains. The two differ at exactly two values and
 * both differences are meaningful: `PrimaryRole` has `FULLSTACK`, because a person can be one,
 * while `LearningCategory` does not, because a document is about the front or about the back and a
 * `FULLSTACK` tab would hold whatever nobody could classify. `LearningCategory` has `CAREER` —
 * interviewing, leading a team — which is a topic to read about and not a job title.
 *
 * So do NOT unify them, and do not feed one into a filter typed for the other.
 *
 * Declared per-feature like `PrimaryRole` above; `bookstore`'s copy carries the note on why one
 * backend enum has three frontend declarations and one shared set of labels.
 */
export type LearningCategory = NonNullable<Schemas['ExplanationResponseDto']['category']>;

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
 * THE ENTITY LEAK IS FIXED (BE `39b5666`, QĐ-0002 "entity không ra khỏi tầng API"). The controller
 * returned `UserProfessionalProfileEntity` until then, which made the persistence model the API
 * contract — a column rename would have been a breaking change nobody planned. It now returns
 * `ProfessionalProfileResponseDto`, whose field set is identical, so nothing here changes shape;
 * `toDto` copies the entity straight across, which is why the nullability notes below still hold.
 *
 * `GET` **404s when no profile exists** — it is `findById().orElseThrow`, not a get-or-create. That
 * is the opposite of `GET /notifications/preferences`, which silently inserts a default row. So a
 * 404 on this endpoint means "not set up yet", not "something went wrong", and the UI needs a real
 * empty state. `PUT` is what creates it (`upsertProfile`).
 */
export type ProfessionalProfile = {
  [K in keyof Required<Schemas['ProfessionalProfileResponseDto']>]: K extends 'workHistory'
    ? WorkExperience[] | null
    : Required<Schemas['ProfessionalProfileResponseDto']>[K] | null;
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
} & {
  /** Not on `ExplanationResponseDto` yet — see `ReferencedVaultNote` above. Always `null` today. */
  referencedNotes: ReferencedVaultNote[] | null;
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
 *
 * `externalLinks` ADDED AT F-B, and it is the field this type existed without for a reason that
 * has expired: the request DTO had no place for the further-reading links, so the UI carried a
 * warning that saving would drop them. The DTO has the field now, so the links are sent — the
 * warning came down and this went up in the same change, because removing the notice without
 * sending the data would have turned a disclosed limitation into a silent one.
 *
 * `category` MUST BE PASSED BACK OR THE SAVED ROW LANDS IN `OTHER`. Gemini now picks the topic
 * while it writes the explanation and `explainPost` returns it, but `saveExplanation` reads it
 * from the REQUEST — `ExplanationEntity.category` defaults to `OTHER`, so a caller that keeps the
 * field to itself files a correctly-classified backend answer under the catch-all, silently, for
 * every explanation the product ever saves. It is optional on the wire and effectively required
 * of any caller that has one.
 */
export type SaveExplanationInput = {
  postId: NonNullable<Schemas['SaveExplanationRequestDto']['postId']>;
  originalContent: NonNullable<Schemas['SaveExplanationRequestDto']['originalContent']>;
  explanationContent: NonNullable<Schemas['SaveExplanationRequestDto']['explanationContent']>;
  concepts?: string[];
  prerequisites?: string[];
  complexityScore?: number;
  externalLinks?: Schemas['ExternalLink'][];
  category?: LearningCategory;
};

/**
 * ---------------------------------------------------------------------------------------------
 * VAULT NOTES — the owner's view of what their Obsidian vault has synced up.
 * ---------------------------------------------------------------------------------------------
 *
 * HAND-WRITTEN RATHER THAN DERIVED FROM `Schemas`, and that is temporary. `VaultNoteSummaryDto`,
 * `VaultNoteDetailDto` and `VaultNotePageResponseDto` were added to the backend on 28/08 and
 * `schema.gen.ts` has not been regenerated since — every other type in this file reads from the
 * generated schema, and these should too the moment it is. They are written to match the Java
 * records field for field so that the switch is a rename and nothing else.
 *
 * The nullability follows the rest of this file's convention: Jackson emits every key, so every
 * field is widened rather than assumed present.
 */

/** One row of the synced-notes list. **No `content`** — see `vaultApi.listNotes`. */
export type VaultNoteSummary = {
  id: number | null;
  filename: string | null;
  tags: string[] | null;
  links: string[] | null;
  createdAt: string | null;
  updatedAt: string | null;
};

/** One note with its body, fetched when the reader opens it. */
export type VaultNoteDetail = VaultNoteSummary & {
  content: string | null;
};

/**
 * A cursor page of notes.
 *
 * `nextCursor` is the id of the last row and is null when nothing follows. Descending **id**, not
 * descending `updatedAt`: a vault push writes hundreds of rows in one transaction and they all
 * land on the same timestamp, so a timestamp cursor would repeat or skip rows at every page
 * boundary.
 */
export type VaultNotePage = {
  items: VaultNoteSummary[];
  nextCursor: number | null;
  hasMore: boolean;
};

/**
 * ---------------------------------------------------------------------------------------------
 * VAULT CONTEXT SETTINGS — which synced notes the AI is allowed to see.
 * ---------------------------------------------------------------------------------------------
 *
 * Hand-written for the same reason as the note types above: `VaultContextSettingsDto` landed on
 * the backend on 28/08 and `schema.gen.ts` predates it.
 *
 * BOTH LISTS EMPTY IS THE DEFAULT AND MEANS NO FILTERING — every synced note is eligible, which
 * is what the product did before these settings existed. `excludeTags` is applied AFTER
 * `includeTags` and always wins: a note tagged both `tech` and `private` is excluded. That order
 * is the safe one; the other way round would let a broad include quietly override a deliberate
 * exclusion, which on a privacy control is the mistake that matters.
 *
 * Tags are stored WITHOUT a leading `#` and folded to lower case — the server normalises on write
 * (trim, strip `#`, lower-case, de-duplicate), so a value read back here will not match what was
 * typed if what was typed was `"#Private "`.
 */
export type VaultContextSettings = {
  includeTags: string[] | null;
  excludeTags: string[] | null;
};

/**
 * Body for the settings PUT. **Both lists, every time** — see `vaultApi.updateSettings`: the
 * server reads an omitted list as empty, not as "unchanged".
 */
export type UpdateVaultContextSettingsInput = {
  includeTags: string[];
  excludeTags: string[];
};

/**
 * ---------------------------------------------------------------------------------------------
 * REFERENCED VAULT NOTES — which of the reader's own notes an explanation drew on.
 * ---------------------------------------------------------------------------------------------
 *
 * HAND-WRITTEN AND NOT YET REAL. `ExplanationResponseDto` has no field for this today —
 * `loadVaultContext` builds a flat string for the Gemini prompt and nothing on the way back says
 * which of those notes the model actually used. This type exists so the frontend shell
 * (`ReferencedNotes`) can be built and reviewed now; every value it describes will read as
 * `undefined` from a real response until the backend adds the field, which is why `Explanation`
 * widens it to `| null` rather than assuming it is present.
 *
 * `noteId` IS DELIBERATELY ABSENT FROM THE SHAPE BELOW. Without it, opening a referenced note from
 * this list means matching `filename` against the reader's synced notes by hand — workable, but
 * fragile against a renamed or duplicate filename. Backend backlog: add `noteId: number | null`
 * alongside `filename` so a click can go straight to `useVaultNote(noteId)`.
 */
export type ReferencedVaultNote = {
  filename: string | null;
  concept: string | null;
};
