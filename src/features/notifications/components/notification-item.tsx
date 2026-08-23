'use client';

import Link from 'next/link';
import {
  AtSign,
  BadgeCheck,
  Bell,
  Heart,
  MessageSquare,
  ShieldX,
  ShoppingBag,
  Star,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRelativeTime } from '@/shared/lib/format';
import { useT } from '@/core/i18n';
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
 * icon, instead of the new type silently rendering the generic bell forever. IT ALSO CAUGHT THE
 * REMOVALS — `POST_SHARED` and `SYSTEM` were dropped from the enum in BE `f0dc820` (nothing could
 * produce either: there is no share endpoint, and `SYSTEM` was only reachable through an internal
 * `send` no controller exposes), and the exhaustive `Record` turned that into a compile error here
 * rather than a dead key nobody noticed. All nine remaining members now have a real producer.
 *
 * Bringing share back means restoring `POST_SHARED` and `FeedPostDataDto.shareCount` together.
 */
const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  POST_LIKED: Heart,
  POST_COMMENTED: MessageSquare,
  POST_TAGGED: AtSign,
  FRIEND_REQUEST: UserPlus,
  FRIEND_ACCEPTED: UserCheck,
  EVENT_RSVP: Bell,
  EVENT_REMINDER: Bell,
  BOOK_REVIEW: Star,
  BOOK_PURCHASED: ShoppingBag,
  // Added by the backend alongside `SKILL_VERIFIED`/`SKILL_REJECTED`, and the exhaustive
  // `Record` did its job: regenerating the schema turned the new members into a compile error
  // here rather than letting them render a generic bell. `BadgeCheck` for the approval because
  // reputation is what it grants; `ShieldX` for the refusal, because a rejection is a decision
  // about a claim rather than an error the reader made.
  SKILL_VERIFIED: BadgeCheck,
  SKILL_REJECTED: ShieldX,
};

/**
 * Where a notification can actually take you.
 *
 * ALL NINE TYPES REACH SOMETHING NOW. This function used to link only the two friendship types,
 * and the note explaining why was right at the time: *"this app has no single-post route and no
 * book-detail route… shipping `/posts/{id}` here would be a link that 404s."* Both routes exist,
 * so a notification that names a thing opens that thing — which is the whole job of a
 * notification, and the one it could not do for seven of the nine.
 *
 * `referenceType` IS WHAT DECIDES, NOT `type`, for everything except friendship. The backend sets
 * the pair together at each producer — `PostReactionService`, `CommentService`, `EventService`
 * and `EventReminderScheduler` all send `referenceType: "POST"` with the post's id;
 * `BookReviewService` and `MomoService` send `"BOOK"` with the book's. Reading the type instead
 * would mean re-deriving a mapping the payload already carries, and it would break silently the
 * day a tenth type ships. The guard on `referenceId` is not defensive noise: the column is
 * nullable, and `/posts/undefined` is a worse outcome than a row that does not navigate.
 *
 * FRIENDSHIP STAYS KEYED OFF `type`, and that exception is real. Its `referenceId` is the
 * FRIEND REQUEST's id, not a person's, and no route takes one — and an accepted request no
 * longer exists on the requests screen, so `FRIEND_ACCEPTED` has to land on the friends list
 * instead. The reference is genuinely unusable here; the other two are not.
 *
 * Returning `null` makes the row a plain `<button>` — still activatable, still marks read, just
 * does not navigate.
 */
function hrefFor(notification: AppNotification): string | null {
  if (notification.type === 'FRIEND_REQUEST') return '/friends/requests';
  if (notification.type === 'FRIEND_ACCEPTED') return '/friends/all';

  /**
   * SKILL DECISIONS LAND ON THE PROFILE, NOT ON THE NODE THEY NAME.
   *
   * The backend sends `referenceType: "ROADMAP_NODE"` with the node's id, and its own comment
   * explains the choice — the node is the linkable thing, the progress row is an internal key.
   * But this app's roadmap route is keyed by ROADMAP (`/roadmap?id=<roadmapId>`), not by node,
   * and a notification carries no roadmap id to resolve one with.
   *
   * The profile is the better destination anyway: it is where a verified skill actually appears,
   * next to the Elite Score the verification just moved. That is what the reader came to see.
   * Sending them to a track to hunt for one node would be technically closer to the reference and
   * further from the point.
   */
  if (notification.type === 'SKILL_VERIFIED' || notification.type === 'SKILL_REJECTED') {
    return '/profile';
  }

  const { referenceType, referenceId } = notification;
  if (referenceId == null) return null;
  if (referenceType === 'POST') return `/posts/${referenceId}`;
  if (referenceType === 'BOOK') return `/books/${referenceId}`;
  return null;
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
          <span className="mt-2 size-2 shrink-0 rounded-nx-full bg-nx-accent" aria-hidden />
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
