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
 * client. 30s is the legacy interval, kept: it is one cheap `COUNT` per user per half-minute,
 * and it bounds how stale the badge can be at a number a person will not notice.
 */
const UNREAD_POLL_MS = 30_000;

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
