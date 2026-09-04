import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for `ProjectController` (`/v1/api/projects`), derived from `schema.gen.ts`.
 * BE package `com.socialapp.matchmaking`.
 *
 * THE NOTE THAT USED TO BE HERE IS OBSOLETE AND IS WORTH QUOTING BECAUSE IT WAS THE REASON THIS
 * DOMAIN HAD NO SCREENS: "Four of the five endpoints return `void` and the fifth is the only read
 * … Nothing lists projects, positions or applications, which is why the ids those endpoints need
 * cannot be obtained from the API at all" (B24).
 *
 * That ceiling is gone. `ProjectController` now has NINE endpoints: a cursor-paged project list, a
 * project-with-positions read, the owner's application inbox, the applicant's own applications —
 * and `createProject` answers `201` with the created `ProjectResponseDto` INCLUDING its id and its
 * positions' ids, which the backend's own javadoc records as a deliberate fix ("this method threw
 * it away, so a client had no way to navigate to what it had just created"). Every id the write
 * endpoints need is now reachable, so the domain is buildable end to end.
 */

/** `SeniorityLevel`, reused from the `knowledge` package's professional profile. */
export type SeniorityLevel = NonNullable<Schemas['SuggestedCandidateDto']['seniorityLevel']>;

/** `PrimaryRole`, same origin as `SeniorityLevel`. */
export type PrimaryRole = NonNullable<Schemas['SuggestedCandidateDto']['primaryRole']>;

/**
 * One shortlisted candidate for a position, best match first (BE `ecc53bb`).
 *
 * DELIBERATELY NARROW, AND NOT A PROFILE. The backend's own javadoc says so: "the full
 * professional profile (work history, explanation style, interested domains) belongs to its owner
 * and is not a project owner's to read through the matchmaking endpoint." So the three missing
 * fields are a privacy decision, not an oversight — a UI must not try to fill them in from
 * somewhere else, and there is nowhere else to fill them from anyway (there is no public profile
 * endpoint).
 *
 * Everything is nullable because `toCandidateDto` copies straight off the profile entity and every
 * one of those columns is optional — a profile with only a job title is valid.
 *
 * `userId` IS THE EXCEPTION and is always present: it is the entity's own key. It is also the only
 * field that identifies the person, and it cannot be turned into a name or a picture — nothing in
 * this app resolves a user id to a profile.
 *
 * `matchScore` and `matchedSkills` ARE THE OTHER EXCEPTION, always present rather than nullable —
 * the backend computes both for every row it returns (`ProfileMatchScorer`), so there is no state
 * in which a candidate arrives without them the way there is for an optional profile column.
 * **This is now an actual ranking**: the list used to be "shares at least one skill" with no order
 * (B24's note, now stale) — `matchScore` is real and the backend sorts by it, so a UI may present
 * position, not just content.
 */
export type SuggestedCandidate = {
  [K in keyof Required<Schemas['SuggestedCandidateDto']>]: K extends 'userId'
    ? NonNullable<Schemas['SuggestedCandidateDto'][K]>
    : K extends 'matchScore' | 'matchedSkills' | 'skillCoveragePercent'
      ? NonNullable<Schemas['SuggestedCandidateDto'][K]>
      : Required<Schemas['SuggestedCandidateDto']>[K] | null;
};

/**
 * One project suggested to the caller, from `GET /v1/api/projects/suggested` (BE `ecc53bb`, new).
 *
 * Wraps `Project` rather than flattening it — the backend's own reasoning (`SuggestedProjectDto`
 * javadoc): three endpoints already answer `ProjectResponseDto` as "a project", and a `matchScore`
 * meaningful on only one of them would make the shared shape worse everywhere to serve this one
 * caller. `matchedSkills`/`matchedDomains` are what produced the score — the caller's own tech
 * stack against the project's open roles, and their interested domains against the project's
 * `tags` — shipped alongside it so a suggestion is not a number nobody can explain to themselves.
 */
export type SuggestedProject = Schemas['SuggestedProjectDto'];

/**
 * One position on a new project — now a full job-description shape (BE `V105`/`task/Ei3AfDgd`).
 *
 * `description` IS GONE and four fields are now REQUIRED: `roleSummary` (40–2000 chars),
 * `responsibilities` (2–15 items), `requirements` (2–15 items) and `requiredSkills` (1–20 items).
 * `title` stays `@NotBlank`; `quantity` is `@Min(1)` and defaults to 1 server-side when omitted;
 * `niceToHave`, `minYearsExperience` and `seniorityLevel` are optional.
 *
 * THE OLD NOTE HERE IS NOW WRONG AND IS QUOTED SO NOBODY REINSTATES THE BEHAVIOUR IT DESCRIBED: "a
 * position with no skills makes `suggestCandidates` return an empty list without querying
 * anything." A position with no `requiredSkills` is a **422** now — the server rejects it outright
 * — because the most common way to post a role was also the surest way to have no candidates. The
 * form must validate against the table in `docs/FEPlanJobDescription.md` so 422 is only ever a
 * safety net.
 */
export type CreatePositionInput = Schemas['ProjectPositionRequestDTO'];

/**
 * `{ url, renderedAt }` from `GET /v1/api/projects/positions/{positionId}/job-description` — a
 * presigned URL (24h) for the role's generated JD PDF, plus when the backend last rendered it.
 *
 * Same shape and lifecycle as the bookstore's `PresignedUrl`: presigned, short-lived, re-fetched
 * through a hook rather than stored. The FIRST read of a role is slow (~1s) because the backend
 * builds the PDF before signing — `hasJobDescription` on the position says whether there is
 * anything to build.
 */
export type JobDescriptionUrl = {
  url: NonNullable<Schemas['JobDescriptionUrlResponse']['url']>;
  renderedAt: NonNullable<Schemas['JobDescriptionUrlResponse']['renderedAt']>;
};

/**
 * Body for `POST /v1/api/projects`.
 *
 * POSITIONS ARE CREATED WITH THE PROJECT AND ONLY THEN. There is no endpoint to add a position to
 * an existing project, so whatever is sent here is the complete and permanent set.
 */
export type CreateProjectInput = Schemas['ProjectRequestDTO'];

/**
 * Body for `POST /positions/{positionId}/apply`.
 *
 * `message` carries no validation at all — not even `@NotBlank` — so an empty application is
 * accepted. The UI decides whether to require it.
 */
export type ApplyToPositionInput = Schemas['ApplicationRequestDTO'];

/**
 * ─── RESPONSE TYPES, all new: none of these existed while the controller had one read. ────────
 */

/** One role on a project. `status` is per-position, so a filled role sits beside an open one. */
export type ProjectPosition = Schemas['ProjectPositionResponseDto'];

/**
 * A project with its roles.
 *
 * `positions` IS PRESENT ON BOTH THE LIST AND THE DETAIL READ, which is worth knowing before
 * writing a screen: the card in a list can show how many roles are open without fetching the
 * project, so browsing costs one request rather than one per card.
 *
 * The author arrives as `authorId` + `authorFullName` + `authorProfilePictureUrl` and **no
 * username**, so a project's author cannot link to `/u/{username}` — the same gap the feed has
 * (B28).
 */
export type Project = Schemas['ProjectResponseDto'];

/** One page of the project list. Cursor-paged, same contract as posts and books. */
export type ProjectPage = Required<Pick<Schemas['ProjectPageResponseDto'], 'hasMore'>> & {
  items: Project[];
  nextCursor?: number;
};

/**
 * One application, as both sides see it.
 *
 * ONE SHAPE FOR TWO AUDIENCES. `GET /{id}/applications` (the owner's inbox) and
 * `GET /applications/mine` (the applicant's own) return the same DTO, which is why it carries both
 * the applicant's identity and the project's title — each side ignores the half it already knows.
 */
export type ProjectApplication = Schemas['ProjectApplicationResponseDto'];

export type ProjectStatus = NonNullable<Project['status']>;
export type PositionStatus = NonNullable<ProjectPosition['status']>;
export type ApplicationStatus = NonNullable<ProjectApplication['status']>;

/**
 * ─── PROJECT MANAGEMENT, all new (BE `task/E4rkd1nF`). ────────────────────────────────────────
 *
 * `createProject` used to be the whole write story — a one-shot with no follow-up. The controller
 * now lets the owner edit the project, walk its status `OPEN ↔ CLOSED → COMPLETED` (the last step
 * one-way), add / edit / close / delete positions, read the team roster and remove a member; and
 * an applicant can withdraw a still-`PENDING` application.
 */

/** One accepted member on a project, from `GET /v1/api/projects/{projectId}/members`. */
export type ProjectMember = Schemas['ProjectMemberDto'];

/** Body for `PUT /v1/api/projects/{projectId}` — title/description/banner/tags, no positions. */
export type UpdateProjectInput = Schemas['UpdateProjectRequestDTO'];

/** Body for `PATCH /v1/api/projects/{projectId}/status`. `COMPLETED` cannot be left (409). */
export type UpdateProjectStatusInput = Schemas['UpdateProjectStatusRequestDTO'];

/**
 * Body for `PUT /v1/api/projects/positions/{positionId}` — same shape as the create body; a null
 * `quantity` means "leave it", and a value below the seats already `ACCEPTED` is a 409.
 */
export type UpdatePositionInput = Schemas['ProjectPositionRequestDTO'];

/** Body for `PATCH /v1/api/projects/positions/{positionId}/status`. `FILLED` is not settable. */
export type UpdatePositionStatusInput = Schemas['UpdatePositionStatusRequestDTO'];
