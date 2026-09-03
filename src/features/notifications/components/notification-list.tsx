'use client';

import { CheckCheck, RefreshCw } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton, toast } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useInfiniteScroll } from '@/shared/lib/use-infinite-scroll';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useUnreadNotificationCount,
} from '../hooks';
import { NotificationItem } from './notification-item';

/**
 * The notification list: paging, the unread header, and the two read-mutations.
 *
 * IT OWNS THE MUTATIONS, THE ROWS DO NOT. A row that invalidated the cache itself would have to
 * know this feature's key layout, and there would be two places to fix when paging changes.
 *
 * INFINITE SCROLL VIA `useInfiniteScroll`, matching the feed. Worth knowing when this looks
 * broken: its observer does not fire at all while `document.visibilityState === 'hidden'`, so a
 * background tab that "will not load more" is usually a hidden tab, not a bug here.
 */
export interface NotificationListProps {
  className?: string;
}

/** One row's worth of placeholder: the type badge, then two lines. */
function ItemSkeleton() {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <Skeleton circle height={36} />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton width={180} height={12} />
        <Skeleton width={120} height={10} />
      </div>
    </div>
  );
}

export function NotificationList({ className }: NotificationListProps) {
  const t = useT();

  const list = useNotifications();
  const { data: unreadCount } = useUnreadNotificationCount();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  const sentinelRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  const notifications = list.data?.pages.flatMap((page) => page.content) ?? [];

  // `unreadCount` is `undefined` only while its own query is still in flight — it is a
  // separate endpoint from the list, so the two can resolve in either order.
  const hasUnread = (unreadCount ?? 0) > 0;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-nx-body-sm text-nx-text-secondary" aria-live="polite">
          {hasUnread
            ? t('notifications.unreadCount', { count: unreadCount ?? 0 })
            : t('notifications.allRead')}
        </p>

        <Button
          variant="secondary"
          size="sm"
          icon={<CheckCheck className="size-4" />}
          onClick={() =>
            markAllAsRead.mutate(undefined, {
              onError: (error) =>
                toast.error(getErrorMessage(error, t('notifications.markAllReadError'))),
            })
          }
          loading={markAllAsRead.isPending}
          // Nothing to mark, so the control is off rather than a no-op that looks like it
          // worked. The backend would answer 200 either way.
          disabled={!hasUnread}
        >
          {t('notifications.markAllRead')}
        </Button>
      </div>

      {/*
        THE THREE BRANCHES BELOW TEST `status`, NOT `isError`, AND THAT DISTINCTION IS A BUG
        THIS CODE ALREADY HAD ONCE. The obvious shape — `isLoading ? skeleton : isError ? error
        : empty` — has a hole: a query can sit at `status: 'pending'` with
        `fetchStatus: 'paused'` (React Query parks a fetch it believes it cannot make), and in
        that state `isLoading` is false and `isError` is false, so the page falls through to
        "you have no notifications". Measured live during P2.6cd verification: the list request
        was failing and the UI was cheerfully reporting an empty inbox.

        "There is nothing" is a claim only the server may make, so the empty state renders only
        on `status === 'success'`; anything else with no data offers a retry instead.
      */}
      <Card padding={8}>
        {list.isPending && list.fetchStatus === 'fetching' ? (
          <div className="flex flex-col">
            {Array.from({ length: 4 }).map((_, index) => (
              <ItemSkeleton key={index} />
            ))}
          </div>
        ) : list.status !== 'success' ? (
          <EmptyState
            compact
            title={t('notifications.error')}
            action={
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw className="size-4" />}
                onClick={() => list.refetch()}
              >
                {t('notifications.retry')}
              </Button>
            }
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            compact
            title={t('notifications.empty.title')}
            description={t('notifications.empty.desc')}
          />
        ) : (
          <div className="flex flex-col">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={(id) =>
                  markAsRead.mutate(id, {
                    onError: (error) =>
                      toast.error(getErrorMessage(error, t('notifications.markReadError'))),
                  })
                }
              />
            ))}

            <div ref={sentinelRef} />

            {isFetchingNextPage && <ItemSkeleton />}

            {!hasNextPage && (
              <p className="py-3 text-center text-nx-caption text-nx-text-muted">
                {t('notifications.allLoaded')}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
