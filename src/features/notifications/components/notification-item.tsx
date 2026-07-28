'use client';

import Link from 'next/link';
import {
  Bell,
  Heart,
  MessageSquare,
  ShoppingBag,
  Star,
  UserCheck,
  UserPlus,
  AtSign,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRelativeTime } from '@/shared/lib/format';
import { useT } from '@/lib/i18n';
import { cn } from '@/shared/lib/cn';
import type { AppNotification, NotificationType } from '../types/notification';

/**
 * One row in the notification list.
 *
 * PRESENTATIONAL: it takes a notification and two callbacks, and holds no query of its own.
 * The list owns the mutations so that a row does not have to know how the cache is keyed.
 */
export interface NotificationItemProps {
  notification: AppNotification;
  /** Called when the row is activated and the notification is still unread. */
  onRead: (id: number) => void;
  className?: string;
}

/**
 * Icon per type.
 *
 * `Record<NotificationType, …>` rather than a lookup with a default, ON PURPOSE: if the backend
 * adds a member to `NotificationType`, this map stops compiling and someone has to choose an
 * icon, instead of the new type silently rendering the generic bell forever. Four of these
 * (`POST_SHARED`, `EVENT_RSVP`, `EVENT_REMINDER`, `SYSTEM`) have no producer in the backend at
 * all today — see `findings/notifications.md` §9 — so they are here for completeness of the
 * union, not because anything will exercise them.
 */
const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  POST_LIKED: Heart,
  POST_COMMENTED: MessageSquare,
  POST_SHARED: MessageSquare,
  POST_TAGGED: AtSign,
  FRIEND_REQUEST: UserPlus,
  FRIEND_ACCEPTED: UserCheck,
  EVENT_RSVP: Bell,
  EVENT_REMINDER: Bell,
  BOOK_REVIEW: Star,
  BOOK_PURCHASED: ShoppingBag,
  SYSTEM: Bell,
};

/**
 * Where a notification can actually take you.
 *
 * MOST OF THEM NOWHERE, AND THAT IS A ROUTING FACT RATHER THAN AN OVERSIGHT. `referenceType`
 * only ever holds `"POST"`, `"BOOK"` or `"FRIEND_REQUEST"`, and this app has no single-post
 * route and no book-detail route — the feed is the only place a post is rendered, and it is
 * paginated from Redis with no way to jump to one entry. Shipping `/posts/{id}` here would be
 * a link that 404s, which the project has already ruled out once for profiles (CLAUDE.md
 * Phase 3.1). So only the two friendship destinations are linked, and they are keyed off
 * `type`, not `referenceType`: an accepted request no longer exists on the requests screen, so
 * `FRIEND_ACCEPTED` belongs on the friends list instead.
 *
 * Returning `null` makes the row a plain `<button>` — still activatable, still marks read, just
 * does not navigate.
 */
function hrefFor(notification: AppNotification): string | null {
  switch (notification.type) {
    case 'FRIEND_REQUEST':
      return '/friends/requests';
    case 'FRIEND_ACCEPTED':
      return '/friends/all';
    default:
      return null;
  }
}

export function NotificationItem({ notification, onRead, className }: NotificationItemProps) {
  const relativeTime = useRelativeTime();
  const t = useT();

  const Icon = TYPE_ICON[notification.type];
  const href = hrefFor(notification);
  const unread = !notification.isRead;

  const handleActivate = () => {
    if (unread) onRead(notification.id);
  };

  const inner = (
    <>
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-nx-full',
          unread ? 'bg-nx-accent-soft text-nx-accent' : 'bg-nx-surface-sunken text-nx-text-muted'
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-nx-ui text-nx-text-primary',
            unread ? 'font-semibold' : 'font-normal'
          )}
        >
          {notification.title}
        </span>

        {/* `body` is nullable in the schema and null on the wire when absent — the key is
            there, the value is not (Jackson ALWAYS). Hence a null check, never `?:`. */}
        {notification.body !== null && (
          <span className="mt-0.5 block text-nx-body-sm text-nx-text-secondary">
            {notification.body}
          </span>
        )}

        <span className="mt-1 block text-nx-caption text-nx-text-muted">
          {relativeTime(notification.createdAt)}
        </span>
      </span>

      {/* Unread marker. It repeats what the bold title already says, which is the point:
          weight alone is not a reliable signal for everyone. The dot itself is not the only
          cue either — the text beside it says so for a screen reader, since colour and shape
          carry nothing there. */}
      {unread && (
        <>
          <span className="mt-1.5 size-2 shrink-0 rounded-nx-full bg-nx-accent" aria-hidden />
          <span className="sr-only">{t('notifications.unreadMarker')}</span>
        </>
      )}
    </>
  );

  const shared = cn(
    'flex w-full items-start gap-3 rounded-nx-md px-3 py-3 text-left',
    'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
    unread && 'bg-nx-accent-soft/40',
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={handleActivate}
        className={cn(shared, 'hover:bg-nx-surface-sunken')}
      >
        {inner}
      </Link>
    );
  }

  // Unread but nowhere to go: still a control, because activating it is what marks it read.
  if (unread) {
    return (
      <button
        type="button"
        onClick={handleActivate}
        className={cn(shared, 'hover:bg-nx-surface-sunken')}
      >
        {inner}
      </button>
    );
  }

  // Read and unlinkable — there is genuinely nothing to activate, so it must not look or
  // behave like a control. A disabled button would still be announced as a button, and a
  // hover highlight would promise an action that does not exist.
  return <div className={shared}>{inner}</div>;
}
