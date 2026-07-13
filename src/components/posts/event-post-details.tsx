'use client';

import { useState } from 'react';
import {
  Calendar,
  CalendarPlus,
  Check,
  Clock,
  Download,
  Loader2,
  MapPin,
  Link as LinkIcon,
  Star,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import {
  useEventAttendeeCount,
  useEventRsvp,
  useExportEventIcs,
  useAddToGoogleCalendar,
  useGoogleCalendarStatus,
  useGoogleCalendarAuthUrl,
} from '@/lib/hooks/use-events';
import { EventAttendeesDialog } from './event-attendees-dialog';
import type { EventDetails, RsvpStatus } from '@/lib/types';

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

const RSVP_OPTIONS: { status: RsvpStatus; icon: React.ElementType; labelKey: string }[] = [
  { status: 'GOING', icon: Check, labelKey: 'post.event.rsvp.going' },
  { status: 'INTERESTED', icon: Star, labelKey: 'post.event.rsvp.interested' },
  { status: 'NOT_GOING', icon: X, labelKey: 'post.event.rsvp.notGoing' },
];

interface EventPostDetailsProps {
  postId: number;
  event: EventDetails;
}

export function EventPostDetails({ postId, event }: EventPostDetailsProps) {
  const t = useT();

  const { data: attendeeCount } = useEventAttendeeCount(postId);
  const { mutate: rsvp, isPending: isRsvping } = useEventRsvp();
  const { mutate: exportIcs, isPending: isExporting } = useExportEventIcs();
  const { mutate: addToCalendar, isPending: isAddingToCalendar } = useAddToGoogleCalendar();
  const { data: calendarConnected } = useGoogleCalendarStatus();
  const { refetch: fetchAuthUrl, isFetching: isFetchingAuthUrl } = useGoogleCalendarAuthUrl();

  // Backend exposes no "my RSVP" endpoint, so highlight is session-only optimistic state.
  const [myRsvp, setMyRsvp] = useState<RsvpStatus | null>(null);
  const [attendeesOpen, setAttendeesOpen] = useState(false);

  const handleRsvp = (status: RsvpStatus) => {
    if (isRsvping) return;
    setMyRsvp(status);
    rsvp({ postId, status });
  };

  const handleCalendarClick = async () => {
    if (calendarConnected) {
      addToCalendar(postId);
      return;
    }
    // Not connected yet: send the user through Google's OAuth consent flow first.
    const { data: authUrl } = await fetchAuthUrl();
    if (authUrl) window.open(authUrl, '_blank', 'noopener');
  };
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

      <button
        type="button"
        onClick={() => setAttendeesOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors cursor-pointer"
      >
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span>
          {t('post.event.attendeeCount', { count: attendeeCount ?? 0 })}
          {event.maxAttendees != null && (
            <> · {t('post.event.maxAttendees', { count: event.maxAttendees })}</>
          )}
        </span>
      </button>

      <EventAttendeesDialog postId={postId} open={attendeesOpen} onOpenChange={setAttendeesOpen} />

      {/* RSVP + calendar actions */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t mt-2">
        {RSVP_OPTIONS.map(({ status: rsvpStatus, icon: Icon, labelKey }) => (
          <Button
            key={rsvpStatus}
            variant={myRsvp === rsvpStatus ? 'default' : 'outline'}
            size="sm"
            className="h-7 px-2.5 text-xs"
            disabled={isRsvping || status === 'past'}
            onClick={() => handleRsvp(rsvpStatus)}
          >
            <Icon className="h-3.5 w-3.5" />
            {t(labelKey)}
          </Button>
        ))}

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs"
            disabled={isAddingToCalendar || isFetchingAuthUrl}
            onClick={handleCalendarClick}
          >
            {isAddingToCalendar || isFetchingAuthUrl ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CalendarPlus className="h-3.5 w-3.5" />
            )}
            {calendarConnected ? t('post.event.addToCalendar') : t('post.event.connectCalendar')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs"
            disabled={isExporting}
            onClick={() => exportIcs(postId)}
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {t('post.event.exportIcs')}
          </Button>
        </div>
      </div>
    </div>
  );
}
