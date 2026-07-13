'use client';

import {
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  Share2,
  AtSign,
  UserPlus,
  UserCheck,
  CalendarCheck,
  CalendarClock,
  Star,
  ShoppingBag,
  Info,
  Loader2,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@/lib/hooks/use-notifications';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { NotificationResponse, NotificationType } from '@/lib/types';

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  POST_LIKED: Heart,
  POST_COMMENTED: MessageCircle,
  POST_SHARED: Share2,
  POST_TAGGED: AtSign,
  FRIEND_REQUEST: UserPlus,
  FRIEND_ACCEPTED: UserCheck,
  EVENT_RSVP: CalendarCheck,
  EVENT_REMINDER: CalendarClock,
  BOOK_REVIEW: Star,
  BOOK_PURCHASED: ShoppingBag,
  SYSTEM: Info,
};

function useRelativeTime() {
  const t = useT();
  return (dateStr: string): string => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return t('post.justNow');
    if (diffMin < 60) return t('post.minutesAgo', { minutes: diffMin });
    if (diffHr < 24) return t('post.hoursAgo', { hours: diffHr });
    if (diffDay < 7) return t('post.daysAgo', { days: diffDay });
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
  };
}

function NotificationRow({ notification }: { notification: NotificationResponse }) {
  const relativeTime = useRelativeTime();
  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const Icon = TYPE_ICONS[notification.type] ?? Info;

  return (
    <button
      type="button"
      onClick={() => {
        if (!notification.isRead) markAsRead(notification.id);
      }}
      className={cn(
        'flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent cursor-pointer',
        !notification.isRead && 'bg-primary/5'
      )}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-snug">{notification.title}</span>
        {notification.body && (
          <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
            {notification.body}
          </span>
        )}
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {relativeTime(notification.createdAt)}
        </span>
      </span>
      {!notification.isRead && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
      )}
    </button>
  );
}

export function NotificationBell() {
  const t = useT();
  const { data: unreadCount } = useUnreadNotificationCount();
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useNotifications();
  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMarkAllNotificationsAsRead();

  const notifications = data?.pages.flatMap((page) => page.content) ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('notifications.title')}
        className="relative inline-flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer outline-none"
      >
        <Bell className="h-5 w-5" />
        {(unreadCount ?? 0) > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount! > 99 ? '99+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">{t('notifications.title')}</span>
          {(unreadCount ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => markAllAsRead()}
              disabled={isMarkingAll}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t('notifications.markAllRead')}
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t('notifications.error')}
            </p>
          )}

          {!isLoading && !isError && notifications.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t('notifications.empty')}
            </p>
          )}

          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} />
          ))}

          {hasNextPage && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  t('notifications.loadMore')
                )}
              </Button>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
