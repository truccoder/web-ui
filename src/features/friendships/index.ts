/**
 * `features/friendships` — mirrors the backend package `com.socialapp.friendships`
 * (FriendshipController, 8 endpoints). Single public barrel; everything outside imports
 * from here.
 */

export { friendshipApi } from './api';

export {
  FriendListItem,
  type FriendListItemProps,
  FriendsList,
  FriendRequests,
  FriendSuggestions,
} from './components';

export {
  friendshipKeys,
  useFriends,
  useInfiniteFriends,
  useFriendSuggestions,
  usePendingRequests,
  useSentRequests,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRejectFriendRequest,
  useCancelFriendRequest,
} from './hooks';

export type {
  FriendProfile,
  FriendListResponse,
  PendingFriendRequest,
  SentFriendRequest,
  FriendSuggestion,
  FriendRequestStatus,
} from './types';
