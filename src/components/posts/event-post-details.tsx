'use client';

import { Calendar, Clock, MapPin, Link as LinkIcon, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/lib/i18n';
import type { EventDetails } from '@/lib/types';

const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

// Uses Intl.DateTimeFormat.formatToParts + manual assembly rather than a combined
// toLocaleString() call — combined date+time locale formatting isn't reliably ordered across
// environments (bit us once already in the event date/time picker), so the parts are pulled
// out individually and assembled in a fixed dd/MM/yyyy HH:mm order every time.
function formatInTimeZone(iso: string, timeZone: string): string {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
}

type EventStatus = 'upcoming' | 'ongoing' | 'past';

function getEventStatus(startTime: string, endTime: string): EventStatus {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (now < start) return 'upcoming';
  if (now > end) return 'past';
  return 'ongoing';
}

const STATUS_BADGE_CLASS: Record<EventStatus, string> = {
  upcoming: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  ongoing: 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400',
  past: 'bg-muted text-muted-foreground',
};

interface EventPostDetailsProps {
  event: EventDetails;
}

export function EventPostDetails({ event }: EventPostDetailsProps) {
  const t = useT();
  // Backend sends absolute UTC instants either way — timezone only affects display, not the
  // past/ongoing/upcoming comparison, which works on instants regardless of display timezone.
  const timeZone = event.timezone || DEFAULT_TIMEZONE;
  const status = getEventStatus(event.startTime, event.endTime);

  return (
    <div className="mt-3 rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Calendar className="h-4 w-4 shrink-0 text-primary" />
          {event.eventTitle}
        </div>
        <Badge variant="outline" className={STATUS_BADGE_CLASS[status]}>
          {t(`post.event.status.${status}`)}
        </Badge>
      </div>

      {event.eventDescription && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
          {event.eventDescription}
        </p>
      )}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span>
          {formatInTimeZone(event.startTime, timeZone)} –{' '}
          {formatInTimeZone(event.endTime, timeZone)}
        </span>
      </div>

      {event.location && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>{event.location}</span>
        </div>
      )}

      {event.onlineUrl && (
        <a
          href={event.onlineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-primary hover:underline w-fit"
        >
          <LinkIcon className="h-3.5 w-3.5 shrink-0" />
          {t('post.event.joinOnline')}
        </a>
      )}

      {event.maxAttendees != null && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          {t('post.event.maxAttendees', { count: event.maxAttendees })}
        </div>
      )}
    </div>
  );
}
