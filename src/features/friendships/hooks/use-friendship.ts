'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { friendshipApi } from '../api/friendship';
import { friendshipKeys } from './keys';

/**
 * 50, NOT 100, BECAUSE 100 IS A 400 AND ALWAYS HAS BEEN. `GET /v1/api/friendships` declares
 * `limit` as `maximum: 50` (checked against `/v3/api-docs`), so every call this hook has ever made
 * was rejected by validation before it reached a query — which is why `/profile`'s `Bạn bè` tile
 * read `—` forever rather than a count, and why the chat picker's friend list opened empty. Found
 * while reworking the profile page, where the tile is the symptom you can see.
 *
 * It is the cap rather than something under it because this hook exists to fill previews in one
 * shot; anything that needs more than the cap wants `useInfiniteFriends`.
 */
const PREVIEW_LIMIT = 50;
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

/**
 * `enabled` exists for ONE caller: the app shell, which now also renders for signed-out readers
 * (see `src/middleware.ts`'s guest surface). A guest has no friend requests and no session to ask
 * with, so the count is not merely empty — the question cannot be put. Defaulted so every other
 * caller is unchanged.
 */
/**
 * `select` UNWRAPS THE PAGE SO EVERY CALLER KEEPS AN ARRAY. The endpoint started returning
 * `{ requests, nextCursor, hasMore }` in the backend's `src` audit, and four callers read this —
 * the requests screen, the rail badge, the profile stat and the friends layout — of which three
 * only want `.length`. Unwrapping here changes nothing for any of them and keeps one place to fix
 * if the cursor ever has to be walked. `select` runs on cached data too, so the shape is
 * consistent whether the page came from the network or the cache.
 *
 * WHAT IS NOT HANDLED, AND IS DELIBERATE: a reader with more than 50 pending requests sees 50.
 * `getPendingRequests` asks for the endpoint's ceiling for exactly that reason, and going further
 * means an infinite query and a "load more" on a screen that has never needed one.
 */
export function usePendingRequests(enabled = true) {
  return useQuery({
    queryKey: friendshipKeys.pending,
    queryFn: () => friendshipApi.getPendingRequests(),
    select: (page) => page.requests,
    enabled,
  });
}

export function useSentRequests() {
  return useQuery({
    queryKey: friendshipKeys.sent,
    queryFn: () => friendshipApi.getSentRequests(),
    select: (page) => page.requests,
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
