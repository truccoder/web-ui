'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api';
import { notificationKeys } from './keys';

/**
 * Notifications state layer. Hooks return the feature's own types directly — no mapping to a UI
 * shape — and raise no toasts and do no navigation; the screens own feedback. Server state lives
 * in React Query, never Redux.
 */

/** How many notifications one request asks for. Matches the backend's own default. */
const PAGE_SIZE = 10;

/**
 * How often the unread badge re-asks the server, in ms.
 *
 * POLLING IS NOT A SHORTCUT HERE, IT IS THE ONLY OPTION. The backend ships no realtime
 * transport at all — no `@EnableWebSocketMessageBroker`, no `SseEmitter`, no
 * `text/event-stream` producer anywhere in `src/main/java` — and `NotificationService.send` is
 * an `@Async` write to Postgres plus an optional OneSignal/SMTP call. Nothing pushes to this
 * client, so the badge is only ever as fresh as this interval.
 *
 * 5s, DOWN FROM 30s. The old note argued 30s was "a number a person will not notice", which is
 * true of someone using the app and false of someone WATCHING it: in a demo the reaction is
 * fired and the bell is expected to answer, and half a minute of nothing reads as broken rather
 * than as polling. The cost is one `COUNT` per signed-in user per five seconds — sixfold, on a
 * query that is already the cheapest one this app runs.
 *
 * This is the honest ceiling, not a realtime effect: nothing is pushed, and no part of the UI
 * pretends otherwise. `docs/backend-plan.md` B6 asks for SSE, which removes the loop entirely
 * rather than tuning it. If this app ever carries real traffic, put the number back to 30_000
 * until that endpoint exists.
 */
// 60s, and it is now a SAFETY NET rather than the mechanism. `useNotificationStream` holds an
// SSE connection open and invalidates this query the moment the server sends one, so the poll
// only has to cover the gap while a dropped stream is reconnecting. It was 5s when polling was
// the only way the badge could ever change.
const UNREAD_POLL_MS = 60_000;

/**
 * GET /v1/api/notifications, paged.
 *
 * THE `+ 2` IS NOT A TYPO, it reconciles two different bases. `lastPage.number` is Spring's
 * 0-based index of the page just received; the request parameter is 1-based and `@Positive`.
 * After receiving `number: 0` the next request must be `page=2`, so `number + 2`. Deriving the
 * cursor from the server's own `number` rather than counting fetched pages means a refetch that
 * lands on a different page cannot desynchronise it.
 *
 * `last` is the stop signal — unlike the feed, this endpoint is a real database query and does
 * report totals, so `last` is trustworthy.
 */
export function useNotifications() {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(),
    queryFn: ({ pageParam }) => notificationsApi.getNotifications(pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 2),
  });
}

/**
 * GET /v1/api/notifications/unread-count, polled.
 *
 * Unwraps the envelope to the bare number, because every consumer of this is a badge and none
 * of them want `{ count }`. The endpoint's other fields do not exist — it is a one-field record.
 */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsApi.getUnreadCount().then((r) => r.count),
    refetchInterval: UNREAD_POLL_MS,
  });
}

/**
 * POST /v1/api/notifications/{id}/read.
 *
 * INVALIDATES RATHER THAN UPDATING OPTIMISTICALLY, on purpose. The endpoint is a silent no-op
 * for an unknown id or someone else's notification — 200 either way — so an optimistic flip
 * would happily show a permanent lie whenever the write did not land. Refetching is what makes
 * the two agree. If the eventual bell UI turns out to flicker (P2.6cd), add the optimistic
 * update *with* a rollback in `onError`; do not simply delete this comment.
 *
 * Both reads are invalidated: the row's `isRead` changed and so did the count.
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: number) => notificationsApi.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

/**
 * POST /v1/api/notifications/read-all — clears the badge in one call.
 *
 * Same two invalidations: `markAllAsRead` is a bulk `UPDATE` in the repository, so every page
 * already fetched is stale, not just the visible one.
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}
