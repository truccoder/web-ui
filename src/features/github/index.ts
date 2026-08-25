/**
 * `features/github` — public surface. BE package `com.socialapp.github`.
 *
 * One controller, five endpoints: get the OAuth URL, exchange the code, read stats, sync now,
 * unlink.
 *
 * THE LINK FLOW IS BLOCKED END TO END, and no UI built on this barrel can currently complete it.
 * Three facts compound (measured at 2ab, full write-up in `findings/github.md` §1):
 *  1. `/v1/api/github/oauth/url` and `/v1/api/auth/github/url` return **byte-identical** URLs —
 *     one `GithubApiClient`, one config block, one `redirect_uri`.
 *  2. That `redirect_uri` is `/oauth/github/callback`, this app's **sign-in** callback, owned by
 *     `features/security`, which spends the single-use code on logging in.
 *  3. `middleware.ts` redirects any signed-in session away from `/oauth/*` before that page even
 *     renders — so the one user who would be linking cannot reach the callback at all.
 * Raised as B23. Reading and unlinking are unaffected and work today.
 *
 * WRITES IN THIS DOMAIN DO NOT REPORT WHAT THEY DID. `linkAccount` and `syncNow` both return
 * `void` and both run through `syncGithubData`, which catches every exception and logs it. A 200
 * means "the request was accepted", never "GitHub answered". Every consumer confirms by
 * re-reading `getStats` and checking `lastSyncedAt`; nothing here is optimistic.
 *
 * A 404 FROM `getStats` MEANS "NOT LINKED" and is an ordinary state, not an error — use
 * `isNotLinked` and render an empty state with a link action.
 *
 * THE UI SHIPS THE READ SURFACE ONLY (P2.14cd). Stats, pinned repos, the contribution graph,
 * sync and unlink are all live; **there is no link button**, because the flow above cannot
 * complete and a button that starts it would silently re-login the user and link nothing. Four of
 * the five endpoints have a consuming surface; `linkAccount` is deferred with a reason and is
 * listed for P4.7.
 */

export { githubApi } from './api';

export {
  GithubStatsCard,
  LinkGithubButton,
  type LinkGithubButtonProps,
  type GithubStatsCardProps,
  PinnedRepoList,
  type PinnedRepoListProps,
  ContributionGraph,
  type ContributionGraphProps,
} from './components';

export {
  githubKeys,
  useGithubStats,
  useGithubOAuthUrl,
  useLinkGithub,
  useSyncGithub,
  useUnlinkGithub,
  isNotLinked,
  isSyncRateLimited,
  type GithubMutationOptions,
} from './hooks';

export type {
  PinnedRepo,
  ContributionCalendar,
  GithubStats,
  RawGithubStats,
  GithubOAuthUrl,
  GithubLinkInput,
} from './types';
