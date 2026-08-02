import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for `ProjectController` (`/v1/api/projects`), derived from `schema.gen.ts`.
 * BE package `com.socialapp.matchmaking`.
 *
 * THIS FILE IS ALMOST ALL REQUEST TYPES, AND THAT IS THE DOMAIN'S DEFINING FACT. Four of the five
 * endpoints return `void` and the fifth is the only read — so there is exactly one response shape
 * here. Nothing lists projects, positions or applications, which is why the ids those endpoints
 * need cannot be obtained from the API at all. Recorded as B24; see `findings/matchmaking.md`.
 */

/** `SeniorityLevel`, reused from the `knowledge` package's professional profile. */
export type SeniorityLevel = NonNullable<Schemas['SuggestedCandidateDto']['seniorityLevel']>;

/** `PrimaryRole`, same origin as `SeniorityLevel`. */
export type PrimaryRole = NonNullable<Schemas['SuggestedCandidateDto']['primaryRole']>;

/**
 * One shortlisted candidate for a position.
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
 */
export type SuggestedCandidate = {
  [K in keyof Required<Schemas['SuggestedCandidateDto']>]: K extends 'userId'
    ? NonNullable<Schemas['SuggestedCandidateDto'][K]>
    : Required<Schemas['SuggestedCandidateDto']>[K] | null;
};

/**
 * One position on a new project.
 *
 * `title` is `@NotBlank`; `quantity` is `@Min(1)` and defaults to 1 server-side when omitted.
 * `requiredSkills` drives the candidate suggestion — a position with no skills makes
 * `suggestCandidates` return an empty list without querying anything.
 */
export type CreatePositionInput = Schemas['ProjectPositionRequestDTO'];

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
