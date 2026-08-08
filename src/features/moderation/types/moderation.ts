import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for `AdminModerationController` (`/v1/api/admin/moderation`), derived from
 * `schema.gen.ts`. BE package `com.socialapp.moderation`.
 *
 * THIS IS THE ONE ADMIN DOMAIN WHOSE GATE ACTUALLY WORKS. The controller carries no
 * `@PreAuthorize` at all, and does not need one: `SecurityConfig` matches `/v1/api/admin/**` and
 * requires `hasRole("ADMIN")` at the URL level, which — unlike method security — is enabled.
 * Worth stating because `features/roadmap` is the opposite case (B20: five endpoints annotated
 * and unenforced), and the difference is easy to get backwards.
 */

/** `ModerationStatus` — the post's position in the moderation state machine. */
export type ModerationStatus = NonNullable<Schemas['PostModerationDetailDto']['currentStatus']>;

/** `ViolationType` — what a rejected post was rejected for. */
export type ViolationType = NonNullable<Schemas['ModerationLogDto']['violationType']>;

/**
 * `Likelihood` — the confidence scale the automatic classifier speaks in, and the shape the
 * review endpoint borrows for its `decision`.
 *
 * SIX VALUES ON THE WIRE, TWO OUTCOMES IN PRACTICE. `AdminModerationService.reviewPost` reduces
 * the whole scale to `decision.isAtLeast(LIKELY)`: `UNKNOWN`, `VERY_UNLIKELY`, `UNLIKELY` and
 * `POSSIBLE` all approve; `LIKELY` and `VERY_LIKELY` both reject. Nothing stores the value the
 * admin picked — the log row records only `APPROVED`/`REJECTED`. Consequences for the UI are in
 * `api/moderation.ts`.
 */
export type Likelihood = NonNullable<Schemas['AdminReviewRequestDto']['decision']>;

/**
 * One entry in a post's moderation history.
 *
 * ALMOST EVERYTHING IS NULLABLE AND THAT IS NOT THE GENERATOR BEING CAUTIOUS. `toLogDto` copies
 * straight off `ModerationLogEntity`, whose scoring columns are filled only by the automatic
 * classifier: a row written by `saveModerationLog` after a human review carries `status` and (for
 * a rejection) `violationType`, and leaves `textToxicityScore`, `imageSafeScore` and
 * `ruleViolations` null. So a history mixes machine rows that have scores with human rows that
 * never will, and the UI must render the absence rather than a zero.
 *
 * `reviewedAt` is null on a row the machine wrote and did not act on; `createdAt` is always there.
 */
export type ModerationLog = {
  [K in keyof Required<Schemas['ModerationLogDto']>]: K extends 'id' | 'postId' | 'createdAt'
    ? NonNullable<Schemas['ModerationLogDto'][K]>
    : Required<Schemas['ModerationLogDto']>[K] | null;
};

/**
 * One post as the moderation queue sees it, with its full history attached.
 *
 * `authorName` IS ALWAYS A STRING BUT NOT ALWAYS A NAME: `toDetailDto` falls back to the literal
 * `"Unknown"` when the author row is gone. A caller cannot distinguish that from a user actually
 * called Unknown, and should not try.
 *
 * `content` and `images` are genuinely nullable — a post can be an event or a book with no prose,
 * and `images` is null rather than empty on posts that never had any.
 *
 * `history` is oldest-first (`findByPostIdOrderByCreatedAtAsc`) and is never null, though it is
 * frequently empty.
 */
export type PostModerationDetail = {
  [K in keyof Required<Schemas['PostModerationDetailDto']>]: K extends 'content' | 'images'
    ? Required<Schemas['PostModerationDetailDto']>[K] | null
    : K extends 'history'
      ? ModerationLog[]
      : NonNullable<Schemas['PostModerationDetailDto'][K]>;
};

/**
 * A user who has been banned at least once — NOT necessarily one who is banned right now.
 *
 * READ `currentlyBanned`, NOT THE PRESENCE OF THE ROW. `getBannedUsers` lists every user with a
 * ban in their history, and `toBannedUserDto` computes `currentlyBanned` from
 * `user.isBanned()`. An expired ban leaves the user in this list with `currentlyBanned: false`
 * and `remainingSeconds: 0`. Treating list membership as "currently banned" would mark people
 * banned for ever.
 *
 * `remainingSeconds` IS COMPUTED AT READ TIME (`Duration.between(now, bannedUntil)`), so it is a
 * snapshot that starts going stale the moment it arrives. It is fine for "about six days left"
 * and wrong for a live countdown.
 */
export type BannedUser = {
  [K in keyof Required<Schemas['BannedUserDto']>]: K extends 'bannedUntil'
    ? string | null
    : NonNullable<Schemas['BannedUserDto'][K]>;
};

/**
 * Body for `POST /posts/{postId}/review`. `decision` is `@NotNull`; `feedback` is free text and
 * is only ever read when the decision rejects.
 */
export type AdminReviewInput = Schemas['AdminReviewRequestDto'];

/** Query parameters shared by the posts and logs searches. All optional; all AND-ed. */
export interface ModerationSearchParams {
  postId?: number;
  userId?: number;
  status?: ModerationStatus;
  /** **1-based.** `page=0` is a 400, not the first page — see the envelope note below. */
  page?: number;
  size?: number;
}

/**
 * The Spring page envelope, minus Spring's internal paging state.
 *
 * `Pick` RATHER THAN `Omit`, DELIBERATELY: picking a key the generated schema does not have is a
 * compile error, so a backend rename surfaces at `tsc` time, whereas `Omit` of a vanished key
 * succeeds silently. Same reasoning `features/notifications` records for its envelope.
 *
 * `pageable` and `sort` are dropped. `sort` in particular is mis-typed by springdoc as an array
 * when `PageImpl` serialises it as an object (documented in `findings/notifications.md` §3), so
 * dropping it also removes a type nobody should trust.
 *
 * NO SHARED GENERIC `Page<T>`. The legacy `lib/types` had one envelope reused by moderation,
 * notifications and social — exactly the cross-domain bucket CLAUDE.md §4 forbids. The generator
 * emits a concrete page schema per DTO, so each feature derives its own.
 *
 * MIND THE OFF-BY-ONE, IT IS ASYMMETRIC. Request `page` is 1-based (`@Positive`, and the
 * controller computes `PageRequest.of(page - 1, size)`), while the response's `number` is
 * Spring's own 0-based index. Asking for page 1 returns `number: 0`.
 */
/**
 * The three page types below repeat the same seven-key `Pick` instead of sharing one generic
 * envelope, and that repetition is the point: each must `Pick` from ITS OWN generated schema, so
 * a field renamed in any one of them fails to compile here. A shared `Page<T>` would type all
 * three off whichever schema it was written against and go on compiling after the other two
 * moved — which is how the legacy envelope hid drift.
 */

/** One page of the post queue. */
export type PostModerationPage = Required<
  Pick<
    Schemas['PagePostModerationDetailDto'],
    'number' | 'size' | 'totalElements' | 'totalPages' | 'first' | 'last' | 'empty'
  >
> & { content: PostModerationDetail[] };

/** One page of raw moderation log rows. */
export type ModerationLogPage = Required<
  Pick<
    Schemas['PageModerationLogDto'],
    'number' | 'size' | 'totalElements' | 'totalPages' | 'first' | 'last' | 'empty'
  >
> & { content: ModerationLog[] };

/** One page of banned users. */
export type BannedUserPage = Required<
  Pick<
    Schemas['PageBannedUserDto'],
    'number' | 'size' | 'totalElements' | 'totalPages' | 'first' | 'last' | 'empty'
  >
> & { content: BannedUser[] };
