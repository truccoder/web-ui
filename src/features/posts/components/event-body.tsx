'use client';

import type { ReactNode } from 'react';
import { CalendarDays, MapPin, Users, Video } from 'lucide-react';
import { Badge } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import { formatDateTime, useIntlLocale } from '@/shared/lib/format';
import type { EventDetails } from '../types/post';

/**
 * Read side of an `EVENT` post — fills `PostCard`'s `body` slot.
 *
 * NO RSVP CONTROL HERE, and unlike the poll this is scheduling rather than a missing
 * endpoint: `EventController` really does expose `POST /events/{postId}/rsvp`, attendee
 * lists, counts, ICS export and the Google Calendar flow — eight endpoints that are
 * **cycle 3** (P2.4″). They arrive through the `actions` slot then. Reading the event is
 * cycle 2 because the card has to exist first.
 *
 * `EVENT` is also the one kind cycle 1's composer never learned to write; the temporary
 * `create-event-form.tsx` bridge still owns that until P2.4″d. This component reads events
 * from whichever path created them.
 */
export interface EventBodyProps {
  details: EventDetails;
  /** RSVP / calendar controls — cycle 3. */
  actions?: ReactNode;
  className?: string;
}

type EventStatus = 'upcoming' | 'ongoing' | 'past';

/**
 * `startTime`/`endTime` are `OffsetDateTime`, so the instant is unambiguous and comparing
 * against `now` needs no timezone maths. The separate `timezone` string is the organiser's
 * intended zone and is shown as a label, never used to recompute the instant — doing both
 * is how a time ends up shifted twice.
 */
function statusOf(start: Date | null, end: Date | null): EventStatus | null {
  const now = Date.now();
  if (start && start.getTime() > now) return 'upcoming';
  if (end && end.getTime() < now) return 'past';
  // Started and either has no end or has not reached it.
  if (start && start.getTime() <= now) return 'ongoing';
  return null;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Same guard as `LinkBody`: an unparseable string must not become an href. */
function safeUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

const statusVariant: Record<EventStatus, 'info' | 'success' | 'neutral'> = {
  upcoming: 'info',
  ongoing: 'success',
  past: 'neutral',
};

/** Spelled out rather than built as `post.event.status.${status}`. Not for type safety —
 *  `TranslateFn` takes a plain `string`, so both compile. The reason is greppability: an
 *  interpolated key cannot be found by searching the translation files, so a later cleanup
 *  reads these three as unused and deletes them. */
const statusKey = {
  upcoming: 'post.event.status.upcoming',
  ongoing: 'post.event.status.ongoing',
  past: 'post.event.status.past',
} as const;

export function EventBody({ details, actions, className }: EventBodyProps) {
  const t = useT();
  const localeTag = useIntlLocale();
  const { eventTitle, eventDescription, startTime, endTime } = details;
  const { timezone, location, onlineUrl, maxAttendees } = details;

  const start = parseDate(startTime);
  const end = parseDate(endTime);
  const status = statusOf(start, end);
  const joinUrl = safeUrl(onlineUrl);

  if (!eventTitle?.trim() && !start) return null;

  const when = start
    ? [formatDateTime(startTime, localeTag), formatDateTime(endTime, localeTag)]
        .filter(Boolean)
        .join(' – ')
    : null;

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-nx-sm border border-nx-border-default p-3',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {eventTitle?.trim() && (
          <p className="text-nx-ui font-semibold text-nx-text-primary">{eventTitle}</p>
        )}
        {status && (
          <Badge dot variant={statusVariant[status]}>
            {t(statusKey[status])}
          </Badge>
        )}
      </div>

      {eventDescription?.trim() && (
        <p className="whitespace-pre-wrap break-words text-nx-body-sm text-nx-text-secondary">
          {eventDescription}
        </p>
      )}

      <div className="flex flex-col gap-1 text-nx-caption text-nx-text-secondary">
        {when && (
          <span className="flex items-center gap-2">
            <CalendarDays aria-hidden className="size-3.5 shrink-0" />
            <span>
              {when}
              {timezone?.trim() ? ` (${timezone})` : ''}
            </span>
          </span>
        )}

        {location?.trim() && (
          <span className="flex items-center gap-2">
            <MapPin aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </span>
        )}

        {joinUrl && (
          <a
            href={joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-nx-text-link hover:text-nx-text-link-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
          >
            <Video aria-hidden className="size-3.5 shrink-0" />
            <span>{t('post.event.joinOnline')}</span>
          </a>
        )}

        {/* The cap the organiser set. NOT how many have signed up — that is
            `GET /events/{postId}/attendees/count`, a cycle-3 call this card does not make.
            Wording says "up to N" so the two are never confused. */}
        {maxAttendees ? (
          <span className="flex items-center gap-2">
            <Users aria-hidden className="size-3.5 shrink-0" />
            <span>{t('post.event.maxAttendees', { count: maxAttendees })}</span>
          </span>
        ) : null}
      </div>

      {actions}
    </div>
  );
}
