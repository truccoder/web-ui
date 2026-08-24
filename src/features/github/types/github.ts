import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for `GithubController` (`/v1/api/github`), derived from `schema.gen.ts` where the
 * generator has anything to say. BE package `com.socialapp.github`.
 *
 * TWO FIELDS ARE HAND-WRITTEN, AND THAT IS THE ONE PLACE THIS PROJECT ALLOWS IT.
 * `GithubStatsResponse.pinnedRepos` and `.contributionGraph` are Jackson `JsonNode` on the Java
 * side, which springdoc can only describe as `JsonNode: Record<string, never>` — a type that
 * rejects every real value it will ever hold. Deriving from that is not a second source of truth,
 * it is no source at all.
 *
 * So their shape is transcribed from the ONLY thing that determines it: the GraphQL queries in
 * `GithubApiClient`, quoted verbatim above each type below. If a query changes, these are wrong
 * and nothing will fail to compile — which is exactly why the query text is pinned here rather
 * than summarised. Everything else on this response is generated as normal.
 */

/**
 * One pinned repository.
 *
 * From `GithubApiClient.fetchPinnedRepos`:
 * ```graphql
 * pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository {
 *   name description url stargazerCount forkCount primaryLanguage { name color } } } }
 * ```
 *
 * `description` and `primaryLanguage` are nullable in GitHub's own schema — a repository can have
 * neither — so they are nullable here. The other four are non-null for any repository.
 *
 * AT MOST SIX, because the query says `first: 6`. Not a page: there is no cursor and no way to
 * ask for more.
 */
export interface PinnedRepo {
  name: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { name: string; color: string | null } | null;
}

/**
 * The contribution calendar.
 *
 * From `GithubApiClient.fetchContributionGraph`:
 * ```graphql
 * contributionsCollection { contributionCalendar {
 *   totalContributions weeks { contributionDays { date contributionCount color } } } }
 * ```
 *
 * `date` is a plain `YYYY-MM-DD` (GitHub's `Date` scalar), NOT a timestamp — do not hand it to
 * anything expecting a zoned value.
 */
export interface ContributionCalendar {
  totalContributions: number;
  weeks: Array<{
    contributionDays: Array<{ date: string; contributionCount: number; color: string }>;
  }>;
}

/**
 * A user's GitHub stats (`GET /stats/{userId}`).
 *
 * EVERY FIELD IS PRESENT WHEN THE ROW EXISTS — `getGithubStats` builds the response from a
 * persisted entity or throws, so there is no partially-filled variant. What varies is whether the
 * two JSON blobs have anything IN them:
 *
 *  - `pinnedRepos` falls back to `[]` when the GraphQL call returns no `data` — the user may
 *    genuinely have no pinned repositories, and a failed fetch looks identical. Empty means
 *    "nothing to show", never "loading" and never "error".
 *  - `contributionGraph` falls back to `{}` in the same case, which is why it is `| null` here
 *    after normalisation rather than a calendar with zero weeks: an object with no
 *    `totalContributions` is not a calendar, and a consumer must not read `.weeks` off it.
 *
 * `lastSyncedAt` is null between linking and the first successful sync. Since a failed sync is
 * silent (see `api/github.ts`), a null here after linking is the clearest available signal that
 * the sync did not work.
 */
export type GithubStats = {
  githubUsername: string;
  publicReposCount: number;
  followersCount: number;
  pinnedRepos: PinnedRepo[];
  contributionGraph: ContributionCalendar | null;
  /** `OffsetDateTime`, so it carries a zone and is safe for `new Date()`. */
  lastSyncedAt: string | null;
};

/**
 * What the endpoint literally answers, before normalisation.
 *
 * Kept separate from `GithubStats` so the un-narrowed `JsonNode` fields cannot leak past the API
 * layer: `normalizeStats` is the single place that turns "whatever JSON arrived" into the two
 * types above, and everything downstream gets the narrowed shape.
 */
export type RawGithubStats = Schemas['GithubStatsResponse'];

/** `GET /oauth/url`. `oauthUrl` is always present — the service builds it from config. */
export type GithubOAuthUrl = Required<Schemas['GithubOAuthUrlResponse']>;

/** Body for `POST /oauth/callback`. `code` is `@NotBlank`. */
export type GithubLinkInput = Schemas['GithubLinkRequest'];
