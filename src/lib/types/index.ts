// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullname: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export type RefreshTokenResponse = LoginResponse;

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface MagicLinkRequest {
  email: string;
}

export interface MagicLinkLoginRequest {
  token: string;
}

export type UserRole = 'USER' | 'ADMIN';

// Raw shape of GET/PUT /v1/api/profile — kept separate from Profile below so the
// fullName->fullname rename (needed to avoid touching every existing `profile?.fullname`
// call site) happens at the API boundary, not scattered across the app.
export interface UserResponse {
  id: number;
  email: string;
  username: string;
  fullName: string;
  profilePictureUrl: string;
  emailVerified: boolean;
  role: UserRole;
  createdAt: string;
}

export interface Profile {
  // Email — kept as the stable identity string used for Twilio/chat, unrelated to userId.
  id: string;
  userId: number;
  fullname: string;
  email: string;
  username: string;
  profilePictureUrl: string;
  emailVerified: boolean;
  role: UserRole;
  createdAt: string;
}

/** Lightweight reference to another user (friends/suggestions lists) — not the full account shape. */
export interface UserSummary {
  id: string;
  fullname: string;
  profilePictureUrl: string;
}

export interface UpdateProfileRequest {
  fullName: string;
}

export interface ProfilePictureUploadResponse {
  profilePictureUrl: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface JwtPayload {
  sub: string;
  fullname: string;
  profilePictureUrl: string;
  email: string;
  [key: string]: unknown;
}

// ─── Friendships ─────────────────────────────────────────────────────────────

export interface SendFriendRequestPayload {
  addresseeId: string;
}

export type FriendRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface PendingFriendRequest {
  id: string;
  requesterId: string;
  requesterFullName: string;
  requesterProfilePictureUrl: string;
  status: FriendRequestStatus;
  createdAt: string;
}

// Raw shape of GET /v1/api/friendships/requests/pending (PendingFriendRequestDto) — ids
// are numeric on the wire; mapped to the string-id PendingFriendRequest type above at the
// hook boundary.
export interface PendingFriendRequestWire {
  id: number;
  requesterId: number;
  requesterFullName: string | null;
  requesterProfilePictureUrl: string | null;
  status: FriendRequestStatus;
  createdAt: string;
}

// Raw shape of the friendships module's UserProfileDto (GET /v1/api/friendships,
// GET /v1/api/friendships/suggestions) — mapped to UserSummary at the API/hook boundary,
// same pattern as UserResponse -> Profile.
export interface FriendProfileWire {
  userId: number;
  username: string;
  fullName: string;
  profilePictureUrl: string;
}

export interface FriendListResponseWire {
  friends: FriendProfileWire[];
  nextCursor: number | null;
  hasMore: boolean;
  totalCount: number;
}

export interface FriendSuggestionWire {
  profile: FriendProfileWire;
  mutualFriends: number;
}

export interface FriendListResult {
  friends: UserSummary[];
  nextCursor: number | null;
  hasMore: boolean;
  totalCount: number;
}

export interface FriendSuggestion extends UserSummary {
  mutualFriends: number;
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export type LocationType = 'COORDINATE' | 'PLACE' | 'REGION';

export type PostVisibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

// All eight backend values. This said `'REGULAR' | 'EVENT' | 'BOOK'` until P2.4'd — the legacy
// composer only wrote those three, but the feed has always been able to hand back the other
// five, so posts created by the new composer were typed as impossible while rendering fine.
export type PostType =
  | 'REGULAR'
  | 'EVENT'
  | 'BOOK'
  | 'CODE_SNIPPET'
  | 'ARTICLE'
  | 'QNA'
  | 'POLL'
  | 'LINK';

// Field name matches the backend's @JsonProperty("display_name") on LocationDetails exactly —
// this type is meant to be passed straight through unchanged from the resolve response into
// CreatePostRequest, so it mirrors the wire shape rather than using frontend camelCase.
export interface LocationDetails {
  display_name?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
}

/*
 * REMOVED AT P2.4″d: `PostLocation`, `LocationResolutionResponse` and the hand-written
 * `EventDetails`. The first two lost their last consumer when `lib/api/location.ts` and
 * `lib/hooks/use-location.ts` went (superseded by `features/posts`' `LocationPicker` and
 * `useResolveLocation`); the third is now imported from `features/posts` above, like the six
 * other detail blocks the feed echoes, so there is one schema-derived definition rather than
 * two that agree by luck.
 */

export interface CreateBookRequest {
  title: string;
  description?: string;
  postId?: number;
  price?: number;
  previewPages?: number;
}

export type BookFileFormat = 'PDF' | 'EPUB';

export interface BookResponse {
  id: number;
  authorId: number;
  postId: number;
  title: string;
  description?: string;
  downloadUrl?: string;
  previewUrl?: string;
  coverImageUrl?: string;
  fileFormat: BookFileFormat;
  fileSizeBytes: number;
  totalPages?: number;
  previewPages?: number;
  price: number;
  currency: string;
  isFree: boolean;
  downloadCount: number;
  avgRating: number;
  reviewCount: number;
  purchased: boolean;
  createdAt: string;
}

export interface BookReview {
  id: number;
  userId: number;
  rating: number;
  feedback?: string;
  createdAt: string;
}

export interface CreateReviewRequest {
  rating: number;
  feedback?: string;
}

export interface RatingBreakdown {
  oneStarCount: number;
  twoStarsCount: number;
  threeStarsCount: number;
  fourStarsCount: number;
  fiveStarsCount: number;
  totalRatings: number;
}

export interface PresignedUrlResponse {
  url: string;
}

export interface PaymentResponse {
  paymentUrl: string;
  transactionRef: string;
  qrCode?: string;
}

export interface PaymentSyncResponse {
  transactionRef: string;
  paid: boolean;
}

/*
 * REMOVED AT P2.4″d: `CreatePostRequest`, `UpdatePostRequest`, `PostAuthor`, `Post`,
 * `CreatePostPayload`, `CreatePostResponse`. All six described the write side of posts, which
 * `features/posts/types/post.ts` has owned since P2.4a; they outlived their last consumer when
 * the event bridge went.
 */

/*
 * REMOVED AT P2.4'd, with the legacy card and `lib/api/posts.ts` that were their only
 * consumers: `ReactionType`, `UpsertReactionRequest`, `MyReactionResponse`,
 * `CreateCommentRequest`, `UpdateCommentRequest`, `CommentResponse` and `SessionComment`.
 * `features/posts/types` owns all of them now, derived from `schema.gen.ts` instead of
 * hand-written here.
 *
 * `SessionComment` was the odd one out and is worth a sentence: it existed because the old
 * card could write comments but never read them, so a comment you had just posted lived only
 * in component state and vanished on reload. `CommentThread` reads the real list, so the type
 * has nothing left to describe.
 */

/*
 * REMOVED AT P2.4″d: `RsvpStatus`, `EventRsvp`, `AttendeeCountResponse`, `AuthUrlResponse`,
 * `CalendarStatusResponse` — the whole Events block, together with `lib/api/events.ts` and
 * `lib/hooks/use-events.ts`. `features/posts/types/event.ts` owns them now, derived from
 * `schema.gen.ts`; the hand-written copies never had a UI consumer at all (the legacy
 * inventory counted Events as 7 endpoints and 0 screens).
 */

/*
 * REMOVED AT P2.5: `FeedBookSummary`, `FeedPostData` and `FeedResponse`, together with
 * `lib/api/newsfeed.ts` and `lib/hooks/use-posts.ts` (the last of that file: `useNewsfeed`
 * plus the `NEWSFEED_QUERY_KEY` seam constant). `features/newsfeed/types/feed.ts` owns the
 * feed payload now, derived from `schema.gen.ts` and — unlike this hand-written copy —
 * modelling absent values as `| null`, which is what the wire actually carries.
 */

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchUser {
  id: number;
  fullName: string;
  username: string;
  profilePictureUrl: string;
}

export interface SearchBook {
  id: number;
  title: string;
  description?: string;
  coverImageUrl?: string;
  authorId: number;
  price: number;
  isFree: boolean;
  avgRating: number;
}

// A book match doesn't get its own result list — it surfaces as its linked post, with
// `book` attached inline, per SearchController's searchPostsWithBookInfo.
export interface SearchPost {
  id: number;
  content: string;
  eventName?: string;
  authorId: number;
  authorFullName: string;
  authorProfilePictureUrl: string;
  visibility: string;
  createdAt: string;
  book?: SearchBook;
}

export interface SearchResponse {
  users: SearchUser[];
  posts: SearchPost[];
}

// ─── Trending ────────────────────────────────────────────────────────────────

export type TrendingSource = 'HACKER_NEWS' | 'DEV_TO' | 'GITHUB' | 'REDDIT' | 'MEDIUM' | 'HBR';

export type TrendingCategory =
  | 'OPENSOURCE'
  | 'EVENT'
  | 'NEW_TECH'
  | 'REGULATION'
  | 'MINDSET'
  | 'TOOL'
  | 'CAREER'
  | 'OTHER';

export type TrendingTimeRange = 'today' | 'week' | 'month';

export interface TrendingItem {
  id: number;
  title: string;
  summary: string;
  url: string;
  source: TrendingSource;
  category: TrendingCategory;
  tags: string[] | null;
  score: number;
  author: string;
  publishedAt: string;
}

export interface TrendingPageResponse {
  items: TrendingItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

// ─── Moderation (admin) ──────────────────────────────────────────────────────

export type ModerationStatus = 'PENDING_MODERATION' | 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED';

export type Likelihood =
  | 'UNKNOWN'
  | 'VERY_UNLIKELY'
  | 'UNLIKELY'
  | 'POSSIBLE'
  | 'LIKELY'
  | 'VERY_LIKELY';

export interface ModerationScores {
  toxicity: number;
  severeToxicity: number;
  insult: number;
  threat: number;
  sexuallyExplicit: number;
  imageSafeScore: number;
}

export type ViolationType =
  | 'HATE_SPEECH'
  | 'NSFW'
  | 'SPAM'
  | 'VIOLENCE'
  | 'THREAT'
  | 'INSULT'
  | 'SEXUALLY_EXPLICIT'
  | 'KEYWORD_BLACKLIST'
  | 'DUPLICATE_CONTENT';

export interface ModerationLog {
  id: number;
  postId: number;
  status: ModerationStatus;
  violationType: ViolationType | null;
  textToxicityScore: number | null;
  imageSafeScore: number | null;
  ruleViolations: string[] | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface PostModerationDetail {
  postId: number;
  authorId: number;
  authorName: string;
  content: string;
  images: string[] | null;
  currentStatus: ModerationStatus;
  createdAt: string;
  updatedAt: string;
  /** Full state-machine history for this post, oldest first. */
  history: ModerationLog[];
}

export interface BannedUser {
  userId: number;
  email: string;
  fullName: string;
  currentlyBanned: boolean;
  bannedUntil: string | null;
  remainingSeconds: number;
  /** Total number of times this user has been banned; the latest ban is the Nth one. */
  banCount: number;
  /** Post IDs that triggered this user's bans; frontend resolves/redirects to each. */
  triggeringPostIds: number[];
}

export interface ModerationSearchParams {
  postId?: number;
  userId?: number;
  status?: ModerationStatus;
  page?: number;
  size?: number;
}

export interface AdminReviewRequest {
  decision: Likelihood;
  feedback?: string;
}

// ─── Pagination (Spring Boot style) ─────────────────────────────────────────

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
