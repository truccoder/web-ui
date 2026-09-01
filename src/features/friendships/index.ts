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
  type FriendRequestsProps,
  FriendSuggestions,
  type FriendSuggestionsProps,
  FriendActionButton,
  type FriendActionButtonProps,
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
  useUnfriend,
} from './hooks';

export type {
  FriendProfile,
  FriendListResponse,
  PendingFriendRequest,
  SentFriendRequest,
  FriendSuggestion,
  FriendRequestStatus,
} from './types';
