// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullname: string;
  profilePictureUrl?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface Profile {
  id: string;
  fullname: string;
  profilePictureUrl: string;
}

export interface UpdateProfileRequest {
  fullname?: string;
  profilePictureUrl?: string;
  refreshToken: string;
}

export interface ChangePasswordRequest {
  newPassword: string;
}

export interface SessionResponse {
  id: string;
  ipAddress: string;
  device: string;
  location: string;
  start: number;
  lastAccess: number;
  current: boolean;
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

export interface SentFriendRequest {
  id: string;
  addresseeId: string;
  addresseeFullName: string;
  addresseeProfilePictureUrl: string;
  status: FriendRequestStatus;
  createdAt: string;
}

export interface UserProfileDto {
  userId: number;
  username: string;
  fullname: string;
  profilePictureUrl: string;
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export type LocationType = 'COORDINATE' | 'PLACE' | 'REGION';

export type PostVisibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

export type PostType = 'REGULAR' | 'EVENT';

export interface LocationDetails {
  displayName?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
}

export interface PostLocation {
  googlePlaceId?: string;
  locationType: LocationType;
  locationDetails?: LocationDetails;
  displayName?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
}

export interface EventDetails {
  eventTitle: string;
  eventDescription?: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  location?: string;
  onlineUrl?: string;
  maxAttendees?: number;
}

export interface CreatePostRequest {
  content?: string;
  googlePlaceId?: string;
  locationType?: LocationType;
  locationDetails?: LocationDetails;
  visibility?: PostVisibility;
  images?: string[];
  taggedUserIds?: number[];
  postType?: PostType;
  eventDetails?: EventDetails;
}

export interface UpdatePostRequest {
  content?: string;
  googlePlaceId?: string;
  locationType?: LocationType;
  locationDetails?: LocationDetails;
  visibility?: PostVisibility;
  images?: string[];
  taggedUserIds?: number[];
}

export interface PostAuthor {
  fullname: string;
  profilePictureUrl?: string;
}

export interface Post {
  id: string;
  content: string;
  location?: PostLocation;
  author: PostAuthor;
  createdAt: string;
}

/** @deprecated Use CreatePostRequest instead */
export interface CreatePostPayload {
  content: string;
  location?: PostLocation;
}

/** @deprecated Use the new response shape from backend */
export interface CreatePostResponse {
  success: boolean;
  message: string;
  data: Post;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export type RsvpStatus = 'GOING' | 'INTERESTED' | 'NOT_GOING';

export interface EventRsvp {
  id: number;
  postId: number;
  userId: number;
  status: RsvpStatus;
  createdAt: string;
}

export interface AttendeeCountResponse {
  count: number;
}

export interface AuthUrlResponse {
  authUrl: string;
}

export interface CalendarStatusResponse {
  connected: boolean;
}

// ─── Newsfeed ────────────────────────────────────────────────────────────────

export interface FeedPostData {
  postId: number;
  authorId: number;
  authorFullName: string;
  authorProfilePictureUrl: string;
  content: string;
  visibility: PostVisibility;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

export interface FeedResponse {
  posts: FeedPostData[];
  page: number;
  size: number;
  hasMore: boolean;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType =
  | 'POST_LIKED'
  | 'POST_COMMENTED'
  | 'POST_SHARED'
  | 'POST_TAGGED'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'EVENT_RSVP'
  | 'EVENT_REMINDER'
  | 'BOOK_REVIEW'
  | 'BOOK_PURCHASED'
  | 'SYSTEM';

export type NotificationChannel = 'PUSH' | 'EMAIL' | 'BOTH';

export type EmailFrequency = 'INSTANT' | 'DAILY_DIGEST' | 'WEEKLY_DIGEST' | 'NONE';

export interface NotificationResponse {
  id: number;
  actorId: number;
  type: NotificationType;
  title: string;
  body: string;
  referenceId: number;
  referenceType: string;
  channel: NotificationChannel;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

export interface NotificationPreference {
  id: number;
  userId: number;
  pushEnabled: boolean;
  emailEnabled: boolean;
  onesignalPlayerId?: string;
  emailFrequency: EmailFrequency;
  mutedTypes: string[];
}

export interface UpdatePreferenceRequest {
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  onesignalPlayerId?: string;
  emailFrequency?: EmailFrequency;
  mutedTypes?: string[];
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface UserDocument {
  id: number;
  fullname: string;
  username: string;
  profilePictureUrl: string;
}

export interface PostDocument {
  id: number;
  content: string;
  authorId: number;
  authorFullName: string;
  authorProfilePictureUrl: string;
  visibility: string;
  createdAt: string;
}

export interface SearchResult<T> {
  items: T[];
  totalHits: number;
  page: number;
  size: number;
}

export interface UnifiedSearchResponse {
  users: UserDocument[];
  posts: PostDocument[];
  totalUsers: number;
  totalPosts: number;
}

// ─── Trending ────────────────────────────────────────────────────────────────

export type TrendingSource =
  | 'HACKER_NEWS'
  | 'DEV_TO'
  | 'GITHUB'
  | 'REDDIT'
  | 'MEDIUM'
  | 'HBR';

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
  tags: string[];
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
