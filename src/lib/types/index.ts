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
  fullName: string;
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
  fullName: string;
  profilePictureUrl: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  profilePictureUrl?: string;
  refreshToken: string;
}

export interface ChangePasswordRequest {
  newPassword: string;
}

export interface SendFriendRequestPayload {
  addresseeId: string;
}

export type FriendRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

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

export interface Page<T> {
  content: T[];
  offset: number;
  pageSize: number;
  totalElements: number;
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
  name?: string;
  preferred_username?: string;
  email?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: unknown;
}

export type LocationType = 'COORDINATE' | 'PLACE' | 'REGION';

export interface PostLocation {
  googlePlaceId?: string;
  locationType: LocationType;
  displayName?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
}

export interface PostAuthor {
  fullName: string;
  profilePictureUrl?: string;
}

export interface Post {
  id: string;
  content: string;
  location?: PostLocation;
  author: PostAuthor;
  createdAt: string;
}

export interface CreatePostPayload {
  content: string;
  location?: PostLocation;
}

export interface CreatePostResponse {
  success: boolean;
  message: string;
  data: Post;
}
