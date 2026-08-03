'use client';

import { Input, Textarea } from '@/shared/components';
import { useT } from '@/core/i18n';
import { cn } from '@/shared/lib/cn';
import type { EventDetails } from '../types/post';

/**
 * The `EVENT` panel of `PostComposer` — the last of the eight kinds to arrive (P2.4″d), which
 * is why it looks like the other kind panels rather than like the bridge it replaces.
 *
 * NATIVE `datetime-local`, NOT A DATEPICKER COMPONENT. The bridge this deletes
 * (`event-datetime-picker.tsx`) rendered `react-datepicker` with 60 lines of its own CSS
 * overriding the library's stylesheet — that package left `package.json` with this checkpoint,
 * since nothing else in the app used it. Replacing it with the browser's own control removes a
 * runtime dependency, a stylesheet the design system has no say over, and a calendar popup
 * whose colours were never going to track the theme — for a field where the native control is
 * already good, localised by the OS, and keyboard-accessible without any work. Same reasoning
 * that cut `pdf-preview.tsx` at P2.4c-4.
 *
 * THE END-TIME SHORTCUTS ARE KEPT, though, because that is the part the old picker actually
 * earned: most events are "an hour or two from the start", and making the author fill a second
 * full timestamp for that is the friction the shortcuts existed to remove. They are plain
 * buttons now instead of a library's UI.
 *
 * VALUES ARE LOCAL DATETIME STRINGS (`YYYY-MM-DDTHH:mm`), the format the native input speaks —
 * the conversion to ISO-8601 happens once, in the composer's `detailsFor`, at the point the
 * payload is built. Converting here would mean parsing back to fill the input on every render.
 *
 * `location` is a PLAIN TEXT LABEL and deliberately has no place lookup, unlike the bridge's
 * `event-location-input.tsx`. The composer already carries a structured place through
 * `LocationPicker`, and `EventDetails.location` is a free string the backend stores verbatim
 * and `EventBody` prints as text. Sending the author through a 5–9 second Gemini resolve to
 * fill a caption they can type is a worse trade, and having two different place pickers in one
 * form invites the question of which one the event is actually at.
 */
export interface EventFieldsProps {
  value: EventDetails;
  onChange: (value: EventDetails) => void;
  className?: string;
}

/** How much later than the start each shortcut puts the end. */
const END_SHORTCUT_HOURS = [1, 2, 3] as const;

/**
 * `Date` → the `YYYY-MM-DDTHH:mm` a `datetime-local` input accepts.
 *
 * Built from the local getters rather than `toISOString().slice(0, 16)`: that one converts to
 * UTC first, so anywhere east or west of Greenwich the shortcut would fill in a time hours
 * away from the one it just calculated.
 */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EventFields({ value, onChange, className }: EventFieldsProps) {
  const t = useT();

  const update = (patch: Partial<EventDetails>) => onChange({ ...value, ...patch });

  const applyShortcut = (hours: number) => {
    if (!value.startTime) return;
    const start = new Date(value.startTime);
    if (Number.isNaN(start.getTime())) return;
    update({ endTime: toLocalInputValue(new Date(start.getTime() + hours * 3600_000)) });
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Input
        label={t('createPost.event.title')}
        value={value.eventTitle ?? ''}
        onChange={(event) => update({ eventTitle: event.target.value })}
      />

      <Textarea
        label={t('createPost.event.description')}
        rows={2}
        value={value.eventDescription ?? ''}
        onChange={(event) => update({ eventDescription: event.target.value })}
      />

      {/* Parent owns the columns: `Input`'s own `className` lands on an inner wrapper, so
          `w-auto` on the field does not reach what sets the width (see poll/book fields). */}
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          type="datetime-local"
          label={t('createPost.event.startTime')}
          value={value.startTime ?? ''}
          onChange={(event) => update({ startTime: event.target.value })}
        />
        <Input
          type="datetime-local"
          label={t('createPost.event.endTime')}
          // The server's rule is end-after-start; `min` states it in the control itself so the
          // browser refuses the impossible range before the composer has to explain it.
          min={value.startTime || undefined}
          value={value.endTime ?? ''}
          onChange={(event) => update({ endTime: event.target.value })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {END_SHORTCUT_HOURS.map((hours) => (
          <button
            key={hours}
            type="button"
            // Nothing to compute from until a start exists, and a shortcut that silently does
            // nothing is worse than one that shows it cannot run yet.
            disabled={!value.startTime}
            onClick={() => applyShortcut(hours)}
            className={cn(
              'rounded-nx-full border border-nx-border-default px-2.5 py-1 text-nx-micro',
              'text-nx-text-secondary',
              'transition-colors duration-[var(--nx-duration-fast)] ease-nx-out',
              'hover:bg-nx-surface-hover hover:text-nx-text-primary',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            {t('createPost.event.endShortcut', { hours })}
          </button>
        ))}
      </div>

      <Input
        label={t('createPost.event.location')}
        value={value.location ?? ''}
        onChange={(event) => update({ location: event.target.value })}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          label={t('createPost.event.onlineUrl')}
          value={value.onlineUrl ?? ''}
          onChange={(event) => update({ onlineUrl: event.target.value })}
        />
        <Input
          type="number"
          min={1}
          label={t('createPost.event.maxAttendees')}
          value={value.maxAttendees ?? ''}
          onChange={(event) =>
            update({ maxAttendees: event.target.value ? Number(event.target.value) : undefined })
          }
        />
      </div>
    </div>
  );
}
