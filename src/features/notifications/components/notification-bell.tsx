'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { Button, IconButton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useUnreadNotificationCount,
} from '../hooks';
import { NotificationItem } from './notification-item';

/**
 * The topbar bell: unread badge, and a panel with the most recent notifications.
 *
 * BUILT AT P3.4, DELIBERATELY NOT AT P2.6cd — the barrel's own header says why: a bell is app
 * shell, and building chrome before the shell exists means guessing at it. What P2.6cd did leave
 * behind is the reason this file is short: `NotificationItem` and both read-mutations already
 * exist, so this adds a container and a badge, not a second notification implementation.
 *
 * THE PANEL IS A PREVIEW, NOT A SECOND LIST. It shows the first page only, with no paging and no
 * infinite scroll, and hands off to `/notifications` for everything else. Reproducing
 * `NotificationList` here would mean two components observing the same cache with different
 * paging state — the exact duplication P2.6cd avoided by giving the list the mutations rather
 * than the rows.
 *
 * OPENING DOES NOT MARK ANYTHING READ. Seeing that something arrived is not reading it, and the
 * backend's `markAsRead` is per-notification precisely so the two stay distinct. The explicit
 * "mark all read" action is there for anyone who wants the badge gone.
 *
 * NO DS SPECIMEN FOR A NOTIFICATION PANEL — `overlays/` has Dialog, Menu, Toast, Tooltip, none of
 * which is a scrollable anchored panel of rows. `Menu` was considered and rejected: its contract
 * is "contextual actions" with `MenuItem` labels, and its keyboard model keeps focus on the
 * trigger with nothing inside focusable, which cannot host rows that are themselves links.
 * Recorded as ds-deviation #29.
 */

/** How many rows the preview shows before deferring to the full page. */
const PREVIEW_COUNT = 6;

export interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount } = useUnreadNotificationCount();
  const list = useNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  // Same outside-click contract as `Menu`, on `mousedown` for the same reason: the panel is gone
  // before the click lands on whatever is underneath.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const notifications = list.data?.pages[0]?.content?.slice(0, PREVIEW_COUNT) ?? [];
  const count = unreadCount ?? 0;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <IconButton
        label={
          count > 0 ? t('notifications.bell.labelUnread', { count }) : t('notifications.bell.label')
        }
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative"
      >
        <Bell />
        {count > 0 && (
          // `ring` in the page background colour cuts the badge out of the icon behind it, so the
          // two never read as one shape. `aria-hidden` because the count is already in the
          // button's accessible name — announcing it twice is noise.
          <span
            aria-hidden
            className={cn(
              'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center',
              'rounded-full bg-nx-status-danger px-1 text-[10px] font-semibold leading-none',
              'text-nx-text-on-color ring-2 ring-nx-surface-card'
            )}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </IconButton>

      {open && (
        <div
          role="dialog"
          aria-label={t('notifications.title')}
          className={cn(
            'absolute right-0 top-[calc(100%+6px)] z-40 w-[min(360px,calc(100vw-2rem))]',
            'overflow-hidden rounded-nx-md border border-nx-border-default bg-nx-surface-raised shadow-nx-2',
            'animate-[nx-enter_var(--nx-duration-fast)_var(--ease-nx-out)]'
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-nx-border-subtle px-3 py-2">
            <span className="text-nx-ui font-medium text-nx-text-primary">
              {t('notifications.title')}
            </span>
            {count > 0 && (
              <Button
                size="sm"
                variant="ghost"
                icon={<CheckCheck />}
                loading={markAllAsRead.isPending}
                onClick={() => markAllAsRead.mutate()}
              >
                {t('notifications.markAllRead')}
              </Button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {/* Three states, not two. `status !== 'success'` is the error case and empty is only
                claimed once the server has actually said so — the bug caught at P2.6cd, where a
                paused query rendered "no notifications" over a list that was merely not loaded. */}
            {list.isPending ? (
              <p className="px-3 py-6 text-center text-nx-body-sm text-nx-text-muted">
                {t('notifications.bell.loading')}
              </p>
            ) : list.status !== 'success' ? (
              <p
                role="alert"
                className="px-3 py-6 text-center text-nx-body-sm text-nx-status-danger-fg"
              >
                {t('notifications.error')}
              </p>
            ) : notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-nx-body-sm text-nx-text-muted">
                {t('notifications.empty.title')}
              </p>
            ) : (
              <div className="divide-y divide-nx-border-subtle">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={(id) => markAsRead.mutate(id)}
                  />
                ))}
              </div>
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className={cn(
              'block border-t border-nx-border-subtle px-3 py-2 text-center text-nx-body-sm',
              'text-nx-text-accent hover:bg-nx-surface-hover',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nx-focus-ring'
            )}
          >
            {t('notifications.bell.viewAll')}
          </Link>
        </div>
      )}
    </div>
  );
}
