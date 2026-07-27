'use client';

import { CalendarPlus, Download, Link2 } from 'lucide-react';
import { Button } from '@/shared/components';
import { useT } from '@/lib/i18n';
import { getErrorMessage } from '@/shared/lib/api-error';
import { cn } from '@/shared/lib/cn';
import {
  useAddToGoogleCalendar,
  useCalendarStatus,
  useExportIcs,
  useGoogleAuthUrl,
} from '../hooks/use-event';

/**
 * Calendar export for an event — the second half of `EventBody`'s `actions` slot.
 *
 * TWO ROUTES THAT ARE NOT ALTERNATIVES. The `.ics` download works for everyone and needs no
 * account anywhere; adding to Google Calendar is server-side and needs the user to have
 * authorised this app. Both are offered because the second one is unavailable to most users
 * most of the time — including, right now, to everyone running this locally, where
 * `google.client-id` is unset and the consent URL the backend builds carries an empty
 * `client_id`. That is a deployment gap, not something the frontend can detect or repair, so
 * this component does not try to hide the button; it just is not the only way out.
 *
 * THE DOWNLOAD CANNOT BE A LINK. `/export.ics` requires the Authorization header, and this
 * app keeps its JWT in localStorage, so an `<a href>` or `window.open` arrives anonymous and
 * gets a 401 — measured. The legacy `lib/api/events.ts` shipped exactly that as
 * `getExportIcsUrl` and nothing ever caught it, because Events had no UI at all. So the body
 * is fetched with credentials and turned into a file here, where the DOM is.
 */
export interface EventCalendarActionsProps {
  postId: number;
  /** `EventDetails.eventTitle`, used only to name the downloaded file. */
  title?: string;
  className?: string;
}

/**
 * A filename the OS will accept, from a title the user typed.
 *
 * Removes the nine characters Windows forbids outright, collapses runs of whitespace, and
 * caps the length — `eventTitle` is a `varchar(500)` on the backend and would exceed the
 * filename limit on every filesystem. Falls back to a fixed name rather than producing a
 * file called `.ics`.
 *
 * Spaces are KEPT: legal on every platform this runs on, and `EliteNexusmeetup.ics` reads as
 * a bug. Control characters are not filtered here — `\s+` already collapses the ones that
 * occur in practice (tab, newline), the rest cannot be typed into a title, and the browser
 * sanitises the `download` attribute before it reaches the filesystem anyway.
 *
 * KEEP THIS CLASS FREE OF ESCAPE SEQUENCES. An earlier revision spelled the control range as
 * a backslash-u escape pair and the tooling that wrote the file turned those escapes into raw bytes,
 * so the class became a literal NUL-to-0x1F range, the file became binary to git, and the
 * regex silently stripped spaces. It was caught only because a real download came out named
 * differently from what the code appeared to say.
 */
function icsFilename(title: string | undefined): string {
  const cleaned = (title ?? '')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned ? `${cleaned}.ics` : 'event.ics';
}

/** Hand the fetched body to the browser as a download. */
function saveIcs(ics: string, filename: string) {
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Without this the blob stays in memory for the life of the document.
  URL.revokeObjectURL(url);
}

export function EventCalendarActions({ postId, title, className }: EventCalendarActionsProps) {
  const t = useT();

  const status = useCalendarStatus();
  const exportIcs = useExportIcs({ onSuccess: (ics) => saveIcs(ics, icsFilename(title)) });
  const addToCalendar = useAddToGoogleCalendar();

  /**
   * Disabled, and fetched by `refetch()` on click instead.
   *
   * The consent URL is only ever needed at the moment of clicking, and asking the backend to
   * mint one for every reader who scrolls past an event would be pure waste. `refetch()`
   * works on a disabled query and hands back the result, which keeps the redirect in the
   * click handler — an effect watching for the data to arrive would fire on re-renders that
   * have nothing to do with the click.
   */
  const authUrl = useGoogleAuthUrl(false);

  const connect = async () => {
    const { data } = await authUrl.refetch();
    if (data?.authUrl) window.location.assign(data.authUrl);
  };

  const connected = status.data?.connected === true;
  const error = exportIcs.error ?? addToCalendar.error ?? authUrl.error;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          icon={<Download className="size-3.5" />}
          loading={exportIcs.isPending}
          onClick={() => exportIcs.mutate(postId)}
        >
          {t('post.event.calendar.download')}
        </Button>

        {/* While the status query is in flight neither button is right yet: offering "add"
            to someone who has not connected produces a 404, and offering "connect" to
            someone already connected sends them through consent for nothing. */}
        {status.isLoading ? null : connected ? (
          <Button
            size="sm"
            variant="secondary"
            icon={<CalendarPlus className="size-3.5" />}
            loading={addToCalendar.isPending}
            disabled={addToCalendar.isSuccess}
            onClick={() => addToCalendar.mutate(postId)}
          >
            {addToCalendar.isSuccess
              ? t('post.event.calendar.added')
              : t('post.event.calendar.add')}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            icon={<Link2 className="size-3.5" />}
            loading={authUrl.isFetching}
            onClick={connect}
          >
            {t('post.event.calendar.connect')}
          </Button>
        )}
      </div>

      {/* `addToCalendar` fails with 404 "Google Calendar not connected" when the stored token
          has gone — which happens without `connected` changing, since that flag only reports
          that a row exists. Showing the server's own sentence is more use than a generic
          failure line, so `getErrorMessage` passes it through. */}
      {error && (
        <p role="status" className="text-nx-micro text-nx-status-danger-fg">
          {getErrorMessage(error)}
        </p>
      )}
    </div>
  );
}
