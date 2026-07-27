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
