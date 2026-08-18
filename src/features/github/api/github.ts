import api from '@/core/api/axios';
import type {
  ContributionCalendar,
  GithubLinkInput,
  GithubOAuthUrl,
  GithubStats,
  PinnedRepo,
  RawGithubStats,
} from '../types/github';

/**
 * `GithubController` (`/v1/api/github`) — 5 endpoints, 5 functions.
 *
 * THE LINK FLOW CANNOT CURRENTLY COMPLETE, and every consumer of this file needs to know it
 * before building anything on `linkAccount`. `GET /oauth/url` returns a URL whose `redirect_uri`
 * is `/oauth/github/callback` — which is this app's **sign-in** callback, owned by
 * `features/security`. Measured at 2ab: `/v1/api/github/oauth/url` and `/v1/api/auth/github/url`
 * answer byte-identical strings, because `OAuthAuthService` and `GithubService` share one
 * `GithubApiClient` and one config block. A GitHub code is single-use, so once the sign-in
 * callback spends it there is nothing left to send here. Raised as B23; details and the two
 * possible resolutions are in `findings/github.md` §1.
 *
 * The function is written and typed anyway: the endpoint is real, the contract is settled, and
 * the fix is a backend config change plus a route — none of which changes this call.
 */
export const githubApi = {
  /**
   * GET /v1/api/github/oauth/url — where to send the user to authorise linking.
   *
   * Read the file note first: this URL currently points at the sign-in callback. It also carries
   * whatever `github.oauth.client-id` is configured, which in this dev environment is a **Google**
   * client id — so the URL cannot authenticate against GitHub here at all.
   */
  getOAuthUrl: () => api.get<GithubOAuthUrl>('/v1/api/github/oauth/url').then((r) => r.data),

  /**
   * POST /v1/api/github/oauth/callback — exchange the authorisation code and link the account.
   *
   * RETURNS `void`, AND A 200 DOES NOT MEAN THE ACCOUNT IS LINKED. `linkAccountWithTokenAndProfile`
   * ends by calling `syncGithubData`, which wraps its whole body in `catch (Exception e) { log }`.
   * On a first-time link the entity is new and unsaved, and the only `save()` sits inside that
   * try — so if GitHub is unreachable, the row is never written and the caller still gets 200.
   * Re-linking an existing account is safer only by accident: that entity is managed, so the
   * setters flush even when the sync fails. Raised as B23.
   *
   * A caller must therefore confirm by re-reading `getStats`, not by trusting the 200.
   */
  linkAccount: (payload: GithubLinkInput) =>
    api.post<void>('/v1/api/github/oauth/callback', payload).then((r) => r.data),

  /**
   * GET /v1/api/github/stats/{userId} — a user's stored stats.
   *
   * **404 IS THE NORMAL "NOT LINKED" ANSWER**, not a failure: `getGithubStats` is
   * `findByUserId(...).orElseThrow`. Measured: `{"code":404,"message":"GitHub account not
   * linked"}`. The state layer must not retry it and the UI must render it as an empty state with
   * a link action, never as an error.
   *
   * TAKES ANY USER ID, and `/u/{username}` finally uses that. This note used to end "nothing else
   * in this app can use that: there is no public profile endpoint, so the only id a screen can
   * supply is the signed-in user's own" — true until 2026-08-09. Callers rendering someone else
   * must pass `readOnly` to `GithubStatsCard`: `sync` and `unlink` take no id and act on the
   * CALLER, so those buttons under another person's name operate on the wrong account.
   *
   * Normalised on the way out — see `normalizeStats`.
   */
  getStats: (userId: number) =>
    api.get<RawGithubStats>(`/v1/api/github/stats/${userId}`).then((r) => normalizeStats(r.data)),

  /**
   * POST /v1/api/github/sync — refresh the stored stats from GitHub now.
   *
   * THREE OUTCOMES, ONLY TWO OF WHICH ARE DISTINGUISHABLE:
   *  - not linked → **404** ("GitHub account not linked"), measured;
   *  - synced less than an hour ago → **409** ("Please wait at least 1 hour before syncing
   *    again"); the limit is hardcoded in `syncNow`, there is no header advertising it;
   *  - otherwise → **200**, whether the sync worked or failed, because `syncGithubData` swallows
   *    everything. The only way to tell is to re-read `getStats` and look at `lastSyncedAt`.
   */
  syncNow: () => api.post<void>('/v1/api/github/sync').then((r) => r.data),

  /**
   * DELETE /v1/api/github/unlink — forget the stored account.
   *
   * IDEMPOTENT AND SILENT: `findByUserId(...).ifPresent(delete)`, so unlinking when nothing is
   * linked answers **200** (measured), not 404. A caller cannot use the status to learn whether
   * anything was there.
   *
   * This deletes the row holding the access token, so it is also the only way to revoke this
   * app's stored GitHub credential.
   */
  unlinkAccount: () => api.delete<void>('/v1/api/github/unlink').then((r) => r.data),
};

/**
 * `JsonNode` → the two narrowed shapes, at the boundary and nowhere else.
 *
 * WHY THIS EXISTS AT ALL: springdoc types both blobs as `Record<string, never>`, so without a
 * conversion here every consumer would either cast or branch on `unknown`. Doing it once, in the
 * API layer, is what lets `GithubStats` be an ordinary well-typed object.
 *
 * The checks are structural rather than exhaustive on purpose. They answer one question — "is
 * this the shape the GraphQL query produces, or is it the empty fallback?" — because those are
 * the only two things the backend can send: `fetchPinnedRepos` returns the node array or
 * `createArrayNode()`, `fetchContributionGraph` returns the calendar or `createObjectNode()`.
 * Validating every field would be guarding against a GitHub schema change, which would need a
 * backend change to reach us anyway.
 */
function normalizeStats(raw: RawGithubStats): GithubStats {
  const pinned = raw.pinnedRepos as unknown;
  const graph = raw.contributionGraph as unknown;

  return {
    // These four are non-null whenever the row exists, and the row exists or the call 404s.
    githubUsername: raw.githubUsername ?? '',
    publicReposCount: raw.publicReposCount ?? 0,
    followersCount: raw.followersCount ?? 0,
    lastSyncedAt: raw.lastSyncedAt ?? null,

    pinnedRepos: Array.isArray(pinned) ? (pinned as PinnedRepo[]) : [],

    // `{}` is the documented fallback and is NOT a calendar — an object with no
    // `totalContributions` has no `weeks` to read either, so it becomes null rather than an
    // object a consumer might try to iterate.
    contributionGraph:
      isRecord(graph) && typeof graph.totalContributions === 'number'
        ? (graph as unknown as ContributionCalendar)
        : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
