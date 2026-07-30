import type { components } from '@/core/api/schema.gen';

type Schemas = components['schemas'];

/**
 * Types for `com.socialapp.friendships` (FriendshipController), derived from
 * `schema.gen.ts`. Response DTOs carry no validation annotations so every field is
 * generated optional; tightened here from the Java records under `friendships/dto`.
 */

type RawProfile = Schemas['UserProfileDto'];
/**
 * A user as it appears inside friend lists / suggestions. `userId` + `fullName` are
 * always set for a real user; `username` is nullable (password sign-up never sets it)
 * and `profilePictureUrl` is nullable (no photo).
 */
export type FriendProfile = Required<Omit<RawProfile, 'username' | 'profilePictureUrl'>> & {
  username?: string;
  profilePictureUrl?: string;
};

type RawFriendList = Schemas['FriendListResponseDto'];
/**
 * Cursor-paginated friends. `friends` is always a list (empty when none) —
 * `List<UserProfileDto>` in `FriendListResponseDto`. `nextCursor` is null at the end of
 * pagination, so it stays optional.
 */
export type FriendListResponse = {
  friends: FriendProfile[];
  nextCursor?: number;
} & Pick<Required<RawFriendList>, 'hasMore' | 'totalCount'>;

type RawPending = Schemas['PendingFriendRequestDto'];
/** An incoming request. Only the requester's picture is nullable. */
export type PendingFriendRequest = Required<Omit<RawPending, 'requesterProfilePictureUrl'>> & {
  requesterProfilePictureUrl?: string;
};

type RawSent = Schemas['SentFriendRequestDto'];
/** An outgoing request. Only the addressee's picture is nullable. */
export type SentFriendRequest = Required<Omit<RawSent, 'addresseeProfilePictureUrl'>> & {
  addresseeProfilePictureUrl?: string;
};

/** A suggested person plus the mutual-friend count. */
export type FriendSuggestion = {
  profile: FriendProfile;
} & Pick<Required<Schemas['FriendSuggestionDto']>, 'mutualFriends'>;

/** Copied from the Java enum `FriendRequestStatus`. */
export type FriendRequestStatus = NonNullable<RawPending['status']>;
