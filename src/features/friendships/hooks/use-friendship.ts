'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { friendshipApi } from '../api/friendship';
import { friendshipKeys } from './keys';

const PREVIEW_LIMIT = 100;
const PAGE_SIZE = 20;

/**
 * Friendships state layer. Hooks return the feature's own DTOs directly — no mapping to a
 * UI shape — and stay free of navigation/toasts; the screens own feedback. Server state
 * lives in React Query, never Redux.
 */

/** One-shot batch of friends, for previews (dashboard, chat picker, birthdays). */
export function useFriends(limit = PREVIEW_LIMIT) {
  return useQuery({
    queryKey: friendshipKeys.friends(limit),
    queryFn: () => friendshipApi.getFriends(undefined, limit),
  });
}

/** Cursor-paginated friends, for the dedicated "all friends" list. */
export function useInfiniteFriends(limit = PAGE_SIZE) {
  return useInfiniteQuery({
    queryKey: friendshipKeys.friendsInfinite(limit),
    queryFn: ({ pageParam }) => friendshipApi.getFriends(pageParam, limit),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
  });
}

export function useFriendSuggestions(limit = 10) {
  return useQuery({
    queryKey: friendshipKeys.suggestions(limit),
    queryFn: () => friendshipApi.getSuggestions(limit),
  });
}

export function usePendingRequests() {
  return useQuery({
    queryKey: friendshipKeys.pending,
    queryFn: () => friendshipApi.getPendingRequests(),
  });
}

export function useSentRequests() {
  return useQuery({
    queryKey: friendshipKeys.sent,
    queryFn: () => friendshipApi.getSentRequests(),
  });
}

/** POST a request; the addressee leaves suggestions and appears in sent. */
export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (addresseeId: number) => friendshipApi.sendRequest(addresseeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendshipKeys.sent });
      queryClient.invalidateQueries({ queryKey: friendshipKeys.suggestionsRoot });
    },
  });
}

/** Accept an incoming request: it leaves pending and the person joins the friends list. */
export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) => friendshipApi.acceptRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendshipKeys.pending });
      queryClient.invalidateQueries({ queryKey: friendshipKeys.friendsRoot });
    },
  });
}

/** Reject an incoming request: it leaves pending. */
export function useRejectFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) => friendshipApi.rejectRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendshipKeys.pending });
    },
  });
}

/** Cancel a request you sent: it leaves sent. */
export function useCancelFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) => friendshipApi.cancelRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendshipKeys.sent });
    },
  });
}

/**
 * End a friendship. Takes the OTHER USER's id, not a request id.
 *
 * INVALIDATES BOTH FRIENDS AND SUGGESTIONS, because the backend changes both: `unfriend` evicts
 * the suggestion cache for **each** of the two people, since they are now candidates for one
 * another again and everyone's mutual-friend counts shifted. Refreshing the friends list alone
 * would leave the suggestions panel confidently omitting the person you just removed.
 *
 * `friendsRoot` rather than a sized key, because the list is cached per `limit` and per infinite
 * page — the prefix sweeps the preview on `/profile` and the paged list on `/friends/all` together.
 *
 * NO OPTIMISTIC REMOVAL. The list is cursor-paginated and carries a server-computed `totalCount`;
 * splicing a row out locally means either leaving that count wrong or recomputing a number the
 * server owns. The same reasoning kept reactions optimistic only on `myReaction` in `posts`.
 *
 * Pending and sent are untouched: ending a friendship creates no request in either direction.
 */
export function useUnfriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => friendshipApi.unfriend(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendshipKeys.friendsRoot });
      queryClient.invalidateQueries({ queryKey: friendshipKeys.suggestionsRoot });
    },
  });
}
